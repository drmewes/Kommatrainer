export const APP_NAME = 'Kommatrainer';
export const MASCOT = 'Schreibi';
// Fired by the home button; a view that must ask before it is left calls preventDefault() on it.
export const HOME_EVENT = 'schreibi:home';
export const defaults = { voice: '', pitch: 1, sound: true, effects: true, tutorialWelcomeSeen: false, childTutorialDone: false, parentTutorialDone: false, testSize: 10, activeBatchId: 'etappe-1', childName: 'Wortprofi', practicePool: 'current', dailyNewLimit: 5, weeklyGoal: 2, reviewLevel: 'normal', keyboard: 'qwertz', starThresholds: [90, 70, 50] };
// Parents enter only a first name or nickname; an empty value falls back to the default.
export const childName = settings => String(settings?.childName ?? '').trim() || defaults.childName;
export const uid = () => crypto.randomUUID();
export { shuffle } from './words.mjs';

// Check results are stars, not grades: an exact word counts fully, a Groß-/Kleinschreibung slip half.
export function starsFor(exact, tolerated, total, thresholds = defaults.starThresholds) {
  if (!total) return 0;
  const score = (exact + tolerated / 2) / total * 100 + 1e-8;
  return thresholds.filter(limit => score >= limit).length;
}

export function materialize(records, batches) {
  const settings = { ...defaults }, batchMap = new Map(batches.map(b => [b.id, b]));
  const attempts = [], sessions = [], tests = [], introductions = [], lessons = [], milestones = [];
  for (const record of records) {
    if (record.kind === 'setting') settings[record.data.key] = record.data.value;
    if (record.kind === 'batch') batchMap.set(record.id, record.data);
    if (record.kind === 'attempt') attempts.push(record.data);
    if (record.kind === 'session') sessions.push(record.data);
    if (record.kind === 'introduction') introductions.push(record.data);
    if (record.kind === 'lesson') lessons.push(record.data);
    if (record.kind === 'milestone') milestones.push(record.data);
    if (record.kind === 'test') { const at = tests.findIndex(t => t.id === record.id); if (at < 0) tests.push(record.data); else tests[at] = record.data; }
  }
  // Deleted lists stay in here; packageState hides them and applies edited built-in Etappen.
  return { settings, batches: [...batchMap.values()], attempts, sessions, tests, introductions, lessons, milestones };
}
