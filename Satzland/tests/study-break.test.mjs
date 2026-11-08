import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceStudyClock, AWAY_RESET_MS, BREAK_DURATION_MS, DRAFT_DEFERS_MS, createStudyClock, IDLE_AFTER_MS, idlePhase, restoreStudyClock, runningExamDraft, snoozeStudyBreak, startStudyBreak, STUDY_INTERVAL_MS, welcomeBack } from '../app/lib/study-break.mjs';

const minute = 60000;
test('the training is complete after thirty minutes of learning across multiple rounds', () => {
  let state = advanceStudyClock(createStudyClock(0), 0, true);
  state = advanceStudyClock(state, 12 * minute, false);
  assert.equal(state.elapsedMs, 12 * minute);
  state = advanceStudyClock(state, 30 * minute, true);
  assert.equal(state.elapsedMs, 12 * minute);
  state = advanceStudyClock(state, 48 * minute, true);
  assert.equal(state.elapsedMs, STUDY_INTERVAL_MS);
  assert.equal(state.phase, 'reminder');
  assert.equal(state.active, false);
});

test('hidden or non-learning time does not accrue', () => {
  let state = advanceStudyClock(createStudyClock(0), 0, true);
  state = advanceStudyClock(state, 2 * minute, false);
  state = advanceStudyClock(state, 60 * minute, false);
  assert.equal(state.elapsedMs, 2 * minute);
  assert.equal(state.phase, 'learning');
  state = advanceStudyClock(state, 61 * minute, true);
  state = advanceStudyClock(state, 62 * minute, true);
  assert.equal(state.elapsedMs, 3 * minute);
});

test('a running exam defers the reminder until the exam ends', () => {
  let state = advanceStudyClock(createStudyClock(0), 0, true, false);
  state = advanceStudyClock(state, 38 * minute, true, false);
  assert.equal(state.phase, 'learning');
  assert.equal(state.elapsedMs, 38 * minute);
  state = advanceStudyClock(state, 38 * minute, false, true);
  assert.equal(state.phase, 'reminder');
});

test('five-minute break uses a deadline even when background ticks are delayed', () => {
  let state = startStudyBreak(createStudyClock(0), 1000);
  assert.equal(state.breakEndsAt, 1000 + BREAK_DURATION_MS);
  state = advanceStudyClock(state, 1000 + BREAK_DURATION_MS - 1, false);
  assert.equal(state.phase, 'break');
  state = advanceStudyClock(state, 1000 + BREAK_DURATION_MS + 90000, false);
  assert.equal(state.phase, 'ready');
  assert.equal(state.elapsedMs, 0);
});

test('snooze offers ten more minutes and a completed break resets learning time', () => {
  let state = advanceStudyClock(snoozeStudyBreak(0), 0, true);
  state = advanceStudyClock(state, 10 * minute - 1, true);
  assert.equal(state.phase, 'learning');
  state = advanceStudyClock(state, 10 * minute, true);
  assert.equal(state.phase, 'reminder');
  const resumed = createStudyClock(5 * minute);
  assert.equal(resumed.elapsedMs, 0);
  assert.equal(resumed.phase, 'learning');
});

test('reload restores a break deadline and does not count time while the app was closed', () => {
  const before = { ...createStudyClock(0), elapsedMs: 10 * minute, active: true };
  const restored = restoreStudyClock(before, 3 * minute);
  assert.equal(restored.elapsedMs, 10 * minute);
  assert.equal(restored.active, false);
  assert.equal(restored.lastAt, 3 * minute);
  // Closed for longer than a break: a fresh learning period.
  assert.deepEqual(restoreStudyClock(before, 60 * minute), createStudyClock(60 * minute));
  // A tab that ticked on in the background and was reloaded later: the last interaction counts, not the last tick.
  assert.deepEqual(restoreStudyClock({ ...before, lastAt: 59 * minute, presentAt: 0 }, 60 * minute), createStudyClock(60 * minute));
  assert.equal(restoreStudyClock({ ...before, lastAt: 59 * minute, presentAt: 55 * minute }, 60 * minute).elapsedMs, 10 * minute);
  const pause = startStudyBreak(before, 0);
  assert.equal(restoreStudyClock(pause, minute).phase, 'break');
  assert.equal(restoreStudyClock(pause, 6 * minute).phase, 'ready');
});

test('invalid stored clock data safely starts a fresh learning period', () => {
  for (const data of [null, {}, { phase: 'broken' }, { phase: 'learning', elapsedMs: -1, breakEndsAt: 0 }, { phase: 'break', elapsedMs: 0, breakEndsAt: Infinity }]) {
    assert.deepEqual(restoreStudyClock(data, 123), createStudyClock(123));
  }
});

test('an unfinished dictation also defers breaks after navigation or reload, scoped to its owner', () => {
  const entries = {
    'schreibi-exam:someone-else:b': JSON.stringify({ batchId: 'b', words: [{}], startedAt: 10 }),
    'schreibi-exam:ronja:bad': 'not json',
    'schreibi-exam:ronja:empty': JSON.stringify({ batchId: 'empty', words: [], startedAt: 10 }),
    'schreibi-exam:ronja:older': JSON.stringify({ batchId: 'older', words: [{}], startedAt: 5 }),
    'schreibi-exam:ronja:active': JSON.stringify({ batchId: 'active', words: [{}], startedAt: 50 }),
  };
  const keys = Object.keys(entries), storage = { length: keys.length, key: i => keys[i], getItem: key => entries[key] };
  assert.deepEqual(runningExamDraft(storage, 'ronja', 100), { batchId: 'active', startedAt: 50 });
  assert.equal(runningExamDraft(storage, 'unknown', 100), null);
  // A dictation interrupted long ago no longer silences break reminders.
  assert.equal(runningExamDraft(storage, 'ronja', 50 + DRAFT_DEFERS_MS + 1), null);
});

test('learning time stops one idle minute after the last interaction', () => {
  let clock = advanceStudyClock(createStudyClock(0), 0, true);
  // The child last did something at second 0; ten idle minutes add only the first idle minute.
  clock = advanceStudyClock(clock, 10 * minute, true, true, IDLE_AFTER_MS);
  assert.equal(clock.elapsedMs, IDLE_AFTER_MS);
  clock = advanceStudyClock(clock, 11 * minute, true, true, 10.5 * minute + IDLE_AFTER_MS);
  assert.equal(clock.elapsedMs, IDLE_AFTER_MS + minute);
  assert.deepEqual([idlePhase(59999), idlePhase(60000), idlePhase(120000)], ['awake', 'asking', 'napping']);
});

test('coming back after ten minutes away starts a fresh learning period, even with a reminder open', () => {
  const learned = { ...createStudyClock(0), elapsedMs: STUDY_INTERVAL_MS - minute, lastAt: 30 * minute };
  assert.equal(welcomeBack(learned, 90 * minute, AWAY_RESET_MS - 1), learned);
  assert.deepEqual(welcomeBack(learned, 90 * minute, AWAY_RESET_MS), createStudyClock(90 * minute));
  assert.equal(welcomeBack({ ...learned, phase: 'reminder' }, 90 * minute, 3 * 60 * minute).elapsedMs, 0);
  // A chosen break keeps its deadline and greets the child when it is over.
  const pause = startStudyBreak(learned, 0);
  assert.equal(welcomeBack(pause, 60 * minute, 60 * minute), pause);
});

test('time while the device slept never counts, even if the tab still looked visible', () => {
  let clock = advanceStudyClock(createStudyClock(0), 0, true);
  clock = advanceStudyClock(clock, 1000, true, true, Infinity, 15000);
  assert.equal(clock.elapsedMs, 1000);
  clock = advanceStudyClock(clock, 8 * minute, true, true, 8 * minute + IDLE_AFTER_MS, 15000);
  assert.equal(clock.elapsedMs, 1000);
  clock = advanceStudyClock(clock, 8 * minute + 1000, true, true, 8 * minute + IDLE_AFTER_MS, 15000);
  assert.equal(clock.elapsedMs, 2000);
});
