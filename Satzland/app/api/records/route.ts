import { and, eq, gte, ne } from 'drizzle-orm';
import { z } from 'zod';
import { ensureLocalTable, getDb } from '../../../db';
import { records } from '../../../db/schema';
import { getUser } from '../../auth';
import { PIN_RECORD_ID } from '../../lib/parent-pin.mjs';

export const dynamic = 'force-dynamic';
const entry = z.object({ id: z.string().min(1).max(160), kind: z.enum(['setting', 'batch', 'attempt', 'session', 'test', 'introduction', 'milestone']), data: z.record(z.unknown()), changeId: z.string().max(100).optional() });
const word = z.object({ id: z.string().min(1).max(160), text: z.string().min(1).max(60), syllables: z.array(z.string().min(1).max(60)).min(1).max(20), article: z.enum(['der', 'die', 'das']).optional(), emoji: z.string().max(20).optional(), sentence: z.string().max(300), help: z.string().max(120).optional(),
  parts: z.array(z.string().min(1).max(60)).max(12).optional(), family: z.array(z.string().min(1).max(60)).max(12).optional(), stress: z.number().int().min(0).max(19).optional(), length: z.enum(['lang', 'kurz', 'zwie']).optional(), knack: z.string().max(40).optional(), pair: z.string().max(60).optional(),
  merk: z.boolean().optional(), profi: z.boolean().optional(), custom: z.boolean().optional() });
const headers = { 'Cache-Control': 'private, no-store' };
const settingKeys = new Set(['voice', 'pitch', 'sound', 'effects', 'tutorialWelcomeSeen', 'childTutorialDone', 'parentTutorialDone', 'testSize', 'activeBatchId', 'childName', 'practicePool', 'dailyNewLimit', 'weeklyGoal', 'reviewLevel', 'keyboard', 'starThresholds']);

// `?since=` returns only rows changed from then on, so a sync reads a handful of rows instead of the whole history.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  await ensureLocalTable();
  const since = Number(new URL(request.url).searchParams.get('since'));
  const now = Date.now();
  // The parent PIN hash shares the table but never leaves the server.
  const rows = await getDb().select().from(records).where(and(eq(records.owner, user.userId), ne(records.kind, 'pin'), ...(since > 0 ? [gte(records.updatedAt, since)] : [])));
  return Response.json({ now, records: rows.map(row => ({ id: row.id, kind: row.kind, data: JSON.parse(row.payload), updatedAt: row.updatedAt })) }, { headers });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2000000) return Response.json({ error: 'Request too large' }, { status: 413 });
  let parsed;
  try { parsed = z.object({ records: z.array(entry).min(1).max(200) }).parse(JSON.parse(raw)); }
  catch { return Response.json({ error: 'Invalid records' }, { status: 400 }); }
  for (const item of parsed.records) {
    const data = item.data;
    if (item.id === PIN_RECORD_ID || item.id.startsWith('lesson:')) return Response.json({ error: 'Reserved record' }, { status: 400 });
    if (JSON.stringify(data).length > 800000) return Response.json({ error: 'Record too large' }, { status: 413 });
    // Own lists, edited built-in Etappen (same id as the original) and resets.
    if (item.kind === 'batch' && !z.object({ id: z.literal(item.id), name: z.string().min(1).max(150), description: z.string().max(2000), words: z.array(word).max(500), deleted: z.boolean().optional(), reset: z.boolean().optional() }).safeParse(data).success) return Response.json({ error: 'Invalid word list' }, { status: 400 });
    if (item.kind === 'setting') {
      const { key, value } = data;
      let valid = settingKeys.has(String(key)) && item.id === 'setting:' + key;
      if (key === 'voice') valid &&= typeof value === 'string' && value.length <= 200;
      if (key === 'pitch') valid &&= typeof value === 'number' && value >= .5 && value <= 2;
      if (['sound', 'effects', 'tutorialWelcomeSeen', 'childTutorialDone', 'parentTutorialDone'].includes(String(key))) valid &&= typeof value === 'boolean';
      if (key === 'testSize') valid &&= Number.isInteger(value) && Number(value) >= 6 && Number(value) <= 14;
      if (key === 'reviewLevel') valid &&= value === 'low' || value === 'normal' || value === 'high';
      if (key === 'dailyNewLimit') valid &&= Number.isInteger(value) && Number(value) >= 3 && Number(value) <= 10;
      if (key === 'weeklyGoal') valid &&= Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 4;
      if (key === 'activeBatchId') valid &&= typeof value === 'string' && value.length <= 160;
      if (key === 'practicePool') valid &&= value === 'current' || value === 'all';
      if (key === 'keyboard') valid &&= value === 'abc' || value === 'qwertz';
      if (key === 'childName') valid &&= typeof value === 'string' && value.trim().length >= 1 && value.length <= 30;
      if (key === 'starThresholds') valid &&= Array.isArray(value) && value.length === 3 && value.every((v, i) => typeof v === 'number' && v >= 0 && v <= 100 && (!i || v < value[i - 1]));
      if (!valid) return Response.json({ error: 'Invalid setting' }, { status: 400 });
    }
    if (['attempt', 'session', 'test', 'introduction', 'milestone'].includes(item.kind) && data.id !== item.id) return Response.json({ error: 'Mismatched record' }, { status: 400 });
    if (item.kind === 'introduction' && !z.object({ id: z.string(), wordId: z.string().min(1).max(160), batchId: z.string().min(1).max(160), at: z.number().finite().positive(), contentKey: z.string().max(4000).optional() }).safeParse(data).success) return Response.json({ error: 'Invalid introduction' }, { status: 400 });
    if (item.kind === 'milestone' && !z.object({ id: z.string(), batchId: z.string().min(1).max(160), at: z.number().finite().positive(), packageKey: z.string().max(500000) }).safeParse(data).success) return Response.json({ error: 'Invalid milestone' }, { status: 400 });
  }
  await ensureLocalTable();
  const db = getDb(), now = Date.now();
  // Immutable answer IDs make offline replays safe; settings and batches are separate mutable records.
  const operations = parsed.records.map(item => {
    const query = db.insert(records).values({ owner: user.userId, id: item.id, kind: item.kind, payload: JSON.stringify(item.data), updatedAt: now });
    return ['setting', 'batch'].includes(item.kind) ? query.onConflictDoUpdate({ target: [records.owner, records.id], set: { kind: item.kind, payload: JSON.stringify(item.data), updatedAt: now } }) : query.onConflictDoNothing();
  });
  await db.batch(operations as [typeof operations[number], ...typeof operations[number][]]);
  return Response.json({ accepted: parsed.records.map(item => item.changeId) }, { headers });
}
