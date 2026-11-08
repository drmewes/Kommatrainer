// One training is about thirty active minutes; then Schreibi says the training is complete and offers a break.
export const STUDY_INTERVAL_MS = 30 * 60 * 1000;
export const BREAK_DURATION_MS = 5 * 60 * 1000;
export const SNOOZE_MS = 10 * 60 * 1000;
// Without any touch, click or key for a minute the learning time stops; the mascot asks, then naps.
export const IDLE_AFTER_MS = 60 * 1000;
export const NAP_AFTER_MS = 2 * 60 * 1000;
// Whoever was gone for ten minutes – app closed, notebook shut, or simply not touching it – has had a break.
// Coming back then starts a fresh learning period instead of continuing the old count.
export const AWAY_RESET_MS = 10 * 60 * 1000;
// Ticks arrive every second while the app is visible. A longer gap means the device slept; that time never counts.
export const MAX_TICK_GAP_MS = 15 * 1000;
// An interrupted dictation only holds back break reminders for a while; one left over from another day does not.
export const DRAFT_DEFERS_MS = 60 * 60 * 1000;
export const idlePhase = idleMs => idleMs >= NAP_AFTER_MS ? 'napping' : idleMs >= IDLE_AFTER_MS ? 'asking' : 'awake';

export function createStudyClock(now = Date.now()) {
  return { phase: 'learning', elapsedMs: 0, breakEndsAt: 0, lastAt: now, active: false };
}

// Learning time only counts up to `activeUntil`, one idle minute after the last interaction.
export function advanceStudyClock(state, now, active, canRemind = true, activeUntil = Infinity, maxStepMs = Infinity) {
  const counts = state.phase === 'learning' && state.active && now - state.lastAt <= maxStepMs;
  const elapsedMs = state.elapsedMs + (counts ? Math.max(0, Math.min(now, activeUntil) - state.lastAt) : 0);
  let phase = state.phase;
  if (phase === 'break' && now >= state.breakEndsAt) phase = 'ready';
  if (phase === 'learning' && elapsedMs >= STUDY_INTERVAL_MS && canRemind) phase = 'reminder';
  return { ...state, phase, elapsedMs, lastAt: now, active: phase === 'learning' && active };
}

export function startStudyBreak(state, now = Date.now()) {
  return { ...state, phase: 'break', elapsedMs: 0, breakEndsAt: now + BREAK_DURATION_MS, lastAt: now, active: false };
}

export function snoozeStudyBreak(now = Date.now()) {
  return { ...createStudyClock(now), elapsedMs: STUDY_INTERVAL_MS - SNOOZE_MS };
}

// A learning period (or an unanswered reminder) ends when the child was away long enough; a chosen break keeps its deadline.
export function welcomeBack(state, now, awayMs) {
  if (awayMs < AWAY_RESET_MS || (state.phase !== 'learning' && state.phase !== 'reminder')) return state;
  return createStudyClock(now);
}

export function restoreStudyClock(saved, now = Date.now()) {
  if (!saved || !['learning', 'reminder', 'break', 'ready'].includes(saved.phase) || !Number.isFinite(saved.elapsedMs) || saved.elapsedMs < 0 || saved.elapsedMs > 86400000 || !Number.isFinite(saved.breakEndsAt)) return createStudyClock(now);
  const state = { ...createStudyClock(now), phase: saved.phase, elapsedMs: saved.elapsedMs, breakEndsAt: saved.breakEndsAt };
  if (state.phase === 'break' && state.breakEndsAt <= now) state.phase = 'ready';
  // The last sign of the child (saved beside the clock) tells how long they were away; background ticks do not.
  const seen = Number.isFinite(saved.presentAt) ? saved.presentAt : saved.lastAt;
  return Number.isFinite(seen) ? welcomeBack(state, now, now - seen) : state;
}

export function runningExamDraft(storage, owner, now = Date.now()) {
  let running = null;
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith('schreibi-exam:' + owner + ':')) continue;
      let draft;
      try { draft = JSON.parse(storage.getItem(key)); } catch { continue; }
      if (typeof draft?.batchId !== 'string' || !Array.isArray(draft.words) || !draft.words.length || !Number.isFinite(draft.startedAt) || now - draft.startedAt > DRAFT_DEFERS_MS) continue;
      if (!running || draft.startedAt > running.startedAt) running = { batchId: draft.batchId, startedAt: draft.startedAt };
    }
  } catch { /* A live dictation still defers reminders if device storage is unavailable. */ }
  return running;
}
