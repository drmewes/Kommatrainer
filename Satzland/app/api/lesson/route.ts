import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ensureLocalTable, getDb } from '../../../db';
import { records } from '../../../db/schema';
import { getUser } from '../../auth';
import { materialize } from '../../lib/engine.mjs';
import { packageState } from '../../lib/curriculum.mjs';
import { learningDay, planPortion } from '../../lib/learning.mjs';
import type { LearningState } from '../../lib/types';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const schema = z.object({ batchId: z.string().min(1).max(160), workAhead: z.boolean().optional() });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403, headers });
  let input;
  try { input = schema.parse(await request.json()); } catch { return Response.json({ error: 'Invalid daily selection' }, { status: 400, headers }); }
  await ensureLocalTable();
  const db = getDb(), now = Date.now(), day = learningDay(now), id = 'lesson:' + day;
  const rows = await db.select().from(records).where(and(eq(records.owner, user.userId)));
  const existing = rows.find(r => r.id === id);
  const state = packageState(materialize(rows.map(r => ({ id: r.id, kind: r.kind, data: JSON.parse(r.payload) })), [])) as LearningState;
  const batch = state.batches.find(b => b.id === input.batchId);
  if (!batch) return Response.json({ error: 'Unknown package' }, { status: 400, headers });
  const previous = existing ? JSON.parse(existing.payload) : null, userId = user.userId;
  const result = planPortion(state, batch, previous, input.workAhead, now);
  if (result.error) return Response.json({ error: result.error }, { status: 409, headers });
  if (!result.save) return Response.json({ lesson: result.lesson }, { headers });
  if (existing) {
    const updated = await db.update(records).set({ payload: JSON.stringify(result.lesson), updatedAt: now }).where(and(eq(records.owner, userId), eq(records.id, id), eq(records.payload, existing.payload))).returning();
    if (!updated.length) return Response.json({ error: 'Selection changed on another device; retry' }, { status: 409, headers });
  } else {
    await db.insert(records).values({ owner: userId, id, kind: 'lesson', payload: JSON.stringify(result.lesson), updatedAt: now }).onConflictDoNothing();
  }
  const [saved] = await db.select().from(records).where(and(eq(records.owner, userId), eq(records.id, id)));
  return Response.json({ lesson: JSON.parse(saved.payload) }, { headers });
}
