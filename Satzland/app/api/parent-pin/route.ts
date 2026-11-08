import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ensureLocalTable, getDb } from '../../../db';
import { records } from '../../../db/schema';
import { getUser } from '../../auth';
import { checkPin, hashPin, PIN_RECORD_ID, validPin } from '../../lib/parent-pin.mjs';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const body = z.union([
  z.object({ action: z.literal('verify'), pin: z.string().max(12) }),
  z.object({ action: z.literal('set'), pin: z.string().max(12), current: z.string().max(12).optional() }),
]);
type Stored = Awaited<ReturnType<typeof hashPin>>;

async function load(owner: string): Promise<Stored | null> {
  await ensureLocalTable();
  const [row] = await getDb().select().from(records).where(and(eq(records.owner, owner), eq(records.id, PIN_RECORD_ID)));
  return row ? JSON.parse(row.payload) : null;
}
async function save(owner: string, stored: Stored) {
  const payload = JSON.stringify(stored), updatedAt = Date.now();
  await getDb().insert(records).values({ owner, id: PIN_RECORD_ID, kind: 'pin', payload, updatedAt }).onConflictDoUpdate({ target: [records.owner, records.id], set: { kind: 'pin', payload, updatedAt } });
}

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  return Response.json({ pinSet: !!await load(user.userId) }, { headers });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403, headers });
  let parsed;
  try { parsed = body.parse(await request.json()); }
  catch { return Response.json({ error: 'Invalid request' }, { status: 400, headers }); }
  const stored = await load(user.userId);
  // The first PIN is chosen during setup; changing it later needs the current PIN or the master PIN.
  const check = parsed.action === 'set' && !stored ? null : await checkPin(stored, parsed.action === 'verify' ? parsed.pin : parsed.current ?? '');
  if (check && check.stored && check.stored !== stored) await save(user.userId, check.stored);
  if (check && !['ok', 'master'].includes(check.result)) return Response.json({ ok: false, result: check.result, retryAfter: check.retryAfter }, { status: check.result === 'locked' ? 429 : 403, headers });
  if (parsed.action === 'verify') return Response.json({ ok: true, master: check?.result === 'master' }, { headers });
  if (!validPin(parsed.pin)) return Response.json({ ok: false, result: 'invalid' }, { status: 400, headers });
  await save(user.userId, await hashPin(parsed.pin));
  return Response.json({ ok: true }, { headers });
}
