export const DAY = 86400000;
export const learningDay = (at = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(at));
export const contentKey = word => JSON.stringify([word.id, word.text]);
export const packageKey = batch => JSON.stringify(batch.words.map(contentKey).sort());
const accepted = a => a.kind === 'exact' || a.kind === 'tolerated';
const independent = a => a.first && !a.hint && !a.guided;
const writing = a => ['write', 'test'].includes(a.mode);
// The five steps of a training portion: meet the words, hear them, apply the rule, take them apart, write them.
export const PATH = ['discover', 'listen', 'rule', 'morph', 'write'];
// Extra rounds when Lotta wants more: warm up with due words, Profi words for the same rule, rules mixed.
export const EXTRA = ['warmup', 'profi', 'mix'];
// Which progress a step builds: an answer in that mode counts for that skill.
/** @type {Record<string, 'heard' | 'ruled' | 'built' | 'written'>} */
export const SKILL = { listen: 'heard', rule: 'ruled', morph: 'built', write: 'written' };
const skillMode = { warmup: 'write', profi: 'rule', mix: 'rule' };
export const attemptMode = mode => skillMode[mode] || mode;
// A ten-year-old manages longer rounds than a second-grader; writing still takes longest.
export const ROUND_MAX = { discover: 6, listen: 8, rule: 8, morph: 6, write: 8, warmup: 6, profi: 6, mix: 8 };
/** @param {import('./types').Batch} batch */
export const coreWords = batch => batch.words.filter(w => !w.profi);
/** @param {import('./types').Batch} batch */
export const profiWords = batch => batch.words.filter(w => w.profi);
/** @param {import('./types').Batch | undefined} batch @returns {import('./types').Mode[]} */
export const stepsOf = batch => /** @type {import('./types').Mode[]} */ (PATH).filter(mode => !(batch?.skip || []).includes(mode));

/** @param {import('./types').Attempt[]} attempts @param {import('./types').Introduction[]} introductions */
export function learningIndex(attempts = [], introductions = []) {
  /** @type {Map<string, import('./types').Attempt[]>} */
  const answers = new Map();
  /** @type {Map<string, import('./types').Introduction[]>} */
  const seen = new Map();
  for (const a of attempts) { if (!answers.has(a.wordId)) answers.set(a.wordId, []); answers.get(a.wordId).push(a); }
  for (const list of answers.values()) list.sort((a, b) => a.at - b.at);
  for (const item of introductions) { if (!seen.has(item.wordId)) seen.set(item.wordId, []); seen.get(item.wordId).push(item); }
  return { answers, seen };
}

/** @param {import('./types').Word} word @param {ReturnType<typeof learningIndex>} index */
export function wordProgress(word, index, now = Date.now(), skill = 'write') {
  const key = contentKey(word);
  const all = (index.answers.get(word.id) || []).filter(a => a.contentKey ? a.contentKey === key : a.expected === word.text);
  const intros = (index.seen.get(word.id) || []).filter(a => !a.contentKey || a.contentKey === key);
  const primary = all.filter(a => independent(a) && writing(a));
  const done = mode => all.some(a => a.mode === mode && independent(a) && accepted(a));
  const heard = done('listen'), ruled = done('rule'), built = done('morph');
  const written = primary.some(accepted), exact = primary.some(a => a.kind === 'exact');
  const relevant = all.filter(a => skill === 'write' ? writing(a) : a.mode === skill);
  const latest = relevant.at(-1);
  let streak = 0; const days = new Set();
  for (const a of [...relevant].reverse()) {
    if (!independent(a) || !accepted(a)) break;
    const day = learningDay(a.at); if (!days.has(day)) { days.add(day); streak++; }
  }
  const needsHelp = !!latest && (!accepted(latest) || latest.hint || latest.guided);
  // Spaced retrieval: after 1, 3, 7, 14 and 30 days; a mistake brings the word back right away.
  const interval = [0, 1, 3, 7, 14, 30][Math.min(streak, 5)];
  const due = latest ? latest.at + (needsHelp ? 0 : interval * DAY) : null;
  // A Groß-/Kleinschreibung slip counts, but the word keeps coming back until it is spelled exactly.
  const spellingNeedsWork = !!latest && writing(latest) && latest.kind === 'tolerated';
  const introduced = intros.length > 0 || all.some(a => a.mode !== 'listen');
  return { introduced, heard, ruled, built, written, exact, all, primary, latest, due,
    overdue: due !== null && due <= now, needsHelp, spellingNeedsWork,
    confirmedDays: new Set(primary.filter(a => a.kind === 'exact').map(a => learningDay(a.at))).size,
    streak, rate: primary.length ? primary.filter(accepted).length / primary.length * 100 : null };
}

/** Progress of the core words; Profi words are counted separately.
 * @param {import('./types').Batch} batch @param {import('./types').Attempt[]} attempts @param {import('./types').Introduction[]} introductions */
export function batchProgress(batch, attempts = [], introductions = [], now = Date.now()) {
  const index = learningIndex(attempts, introductions), words = coreWords(batch).map(word => ({ word, ...wordProgress(word, index, now) }));
  const profi = profiWords(batch).map(word => ({ word, ...wordProgress(word, index, now) }));
  return { total: words.length, introduced: words.filter(w => w.introduced).length, heard: words.filter(w => w.heard).length,
    ruled: words.filter(w => w.ruled).length, built: words.filter(w => w.built).length, written: words.filter(w => w.written).length,
    exact: words.filter(w => w.exact).length, confirmed: words.filter(w => w.confirmedDays >= 2 && !w.needsHelp).length,
    due: words.filter(w => w.overdue).length, words, profi, profiTotal: profi.length,
    profiSeen: profi.filter(w => w.introduced).length, profiRuled: profi.filter(w => w.ruled || w.written).length };
}

// The Etappen-Check opens once every core word was met, half of them solved on the Regelweg and written,
// and one complete writing round reached at least half. Reached access stays.
export function weeklyReadiness(batch, sessions = [], attempts = [], introductions = [], milestones = []) {
  const progress = batchProgress(batch, attempts, introductions), half = Math.ceil(progress.total / 2), signature = packageKey(batch);
  const rounds = sessions.filter(s => s.mode === 'write' && s.batchId === batch.id && s.total > 0 && s.completed !== false && (!s.packageKey || s.packageKey === signature)).sort((a, b) => a.at - b.at);
  const writingPassed = rounds.some(s => s.correct / s.total >= .5);
  const checks = [progress.total > 0 && progress.introduced === progress.total, progress.ruled >= half && half > 0, progress.written >= half && half > 0, writingPassed];
  const earned = milestones.some(m => m.batchId === batch.id && m.packageKey === signature);
  return { ...progress, half, checks, writingPassed, unlocked: earned || checks.every(Boolean), signature,
    score: rounds.length ? Math.round(rounds.at(-1).correct / rounds.at(-1).total * 100) : null, lastRoundAt: rounds.at(-1)?.at || null };
}

const doneCount = (p, mode) => mode === 'discover' ? p.introduced : p[SKILL[mode]];
export function lessonProgress(batch, lesson, attempts = [], introductions = []) {
  const selected = coreWords(batch).filter(w => lesson?.batchId === batch.id && lesson.wordIds.includes(w.id));
  const progress = batchProgress({ ...batch, words: selected }, attempts, introductions);
  const half = Math.ceil(progress.total / 2), noNew = progress.total === 0, steps = stepsOf(batch);
  const known = noNew ? batchProgress(batch, attempts, introductions).introduced : 0;
  // A step opens once half of the portion is solved in the step before; the first one once all words were met.
  // Without a portion here (offline, or today's portion is in another Etappe) met words can still be practised.
  /** @type {Record<string, boolean>} */
  const open = { discover: true };
  steps.slice(1).forEach((mode, i) => { open[mode] = noNew ? known > 0 : i === 0 ? progress.introduced === progress.total : open[steps[i]] && doneCount(progress, steps[i]) >= half; });
  for (const mode of PATH) if (!steps.includes(mode)) open[mode] = false;
  // Complete means every word of the portion went through every step without help.
  const complete = !noNew && steps.slice(1).every(mode => doneCount(progress, mode) === progress.total);
  // Finished: complete, or every word at least tried in writing; a word that will not stick yet stays in review.
  const tried = progress.words.filter(w => w.all.some(a => writing(a) && a.first)).length;
  const finished = complete || !noNew && progress.introduced === progress.total && !!open.write && tried === progress.total;
  const allWritten = !noNew && progress.written === progress.total;
  /** @type {import('./types').Mode} */
  const nextMode = noNew ? known === coreWords(batch).length ? 'write' : 'discover' : progress.introduced < progress.total ? 'discover'
    : steps.slice(1).find(mode => doneCount(progress, mode) < half) || (!allWritten ? 'write' : steps.slice(1).find(mode => doneCount(progress, mode) < progress.total) || 'write');
  return { ...progress, steps, open, nextMode, complete, finished };
}

// Once today's portion is finished: the step the Etappen-Check still needs and a round can change.
// Practising met words comes first, meeting new ones last. Given `today`, words and rounds already tried
// that day rest until tomorrow instead of being suggested round after round.
/** @returns {import('./types').Mode | null} */
export function weeklyStep(ready, today = null) {
  if (ready.unlocked) return null;
  const rested = (w, tried) => !!today && w.all.some(a => tried(a) && learningDay(a.at) === today);
  const open = (skill, tried) => ready.words.some(w => w.introduced && !w[skill] && !rested(w, tried));
  const roundToday = !!today && !!ready.lastRoundAt && learningDay(ready.lastRoundAt) === today;
  if (!ready.checks[1] && open('ruled', a => a.mode === 'rule')) return 'rule';
  if (!ready.checks[2] && open('written', writing) || !ready.checks[3] && ready.introduced > 0 && !roundToday) return 'write';
  return ready.checks[0] ? null : 'discover';
}

// What the training place offers and recommends; the home page, the check page and the flow tests share it.
/** @param {Pick<import('./types').LearningState, 'batches' | 'lessons' | 'sessions' | 'attempts' | 'introductions' | 'milestones' | 'settings'>} state @param {import('./types').Batch} batch */
export function practicePlan(state, batch, now = Date.now()) {
  const { attempts, introductions } = state, lesson = activeLesson(state.lessons, batch, attempts, introductions, now);
  const day = lessonProgress(batch, lesson, attempts, introductions), ready = weeklyReadiness(batch, state.sessions, attempts, introductions, state.milestones);
  const discover = roundWords(batch, state.batches, attempts, introductions, lesson, 'discover').length;
  // A fully introduced portion never repeats: Get to know then works ahead, also while single shaky words could be
  // looked at again. It stays in this Etappe while it has new words; the next Etappe follows once this check is
  // ready and no portion is open, also on a day without new words here. Without a portion here (today's is
  // elsewhere, or not loaded yet) it fetches one.
  const portion = day.total > 0 && !day.finished, waiting = !day.total && !day.open[day.steps[1]];
  const aheadFound = day.introduced === day.total ? aheadPackage(state.batches, batch, attempts, introductions) : null;
  const nextWeek = aheadFound && aheadFound.id !== batch.id && ready.unlocked && !portion ? aheadFound : null;
  const aheadFrom = aheadFound?.id === batch.id ? batch : nextWeek;
  const ahead = aheadFrom ? portionSizes(unseenWords(aheadFrom, attempts, introductions).length, Math.min(10, state.settings.dailyNewLimit), 10)[0] || 0 : 0;
  // Today's portion leads. A complete portion moves on to the next new words; a finished but shaky one practises
  // what the check still needs. The last new words of the Etappe follow once nothing else is missing.
  const weekly = portion || waiting ? null : weeklyStep(ready, learningDay(now)), unseen = unseenWords(batch, attempts, introductions).length;
  const last = weekly === 'discover' && aheadFrom === batch && unseen <= ahead && ready.checks.slice(1).every(Boolean);
  /** @type {import('./types').Mode | null} */
  const next = portion ? day.nextMode : ahead && (waiting || day.complete || last || nextWeek) ? 'discover' : weekly === 'discover' ? null : weekly;
  // The check page always leads to what is missing, new words included.
  /** @type {import('./types').Mode} */
  const testStep = portion ? day.nextMode : waiting ? 'discover' : weeklyStep(ready) || 'write';
  return { lesson, day, ready, discover, unseen, ahead, aheadFrom, nextWeek, portion, waiting, next, testStep };
}

// Resume a previous unfinished portion before reserving another day's new words.
export function activeLesson(lessons, batch, attempts = [], introductions = [], now = Date.now()) {
  const today = learningDay(now), current = lessons.find(l => l.day === today);
  if (current) return current;
  return [...lessons].filter(l => l.day < today && l.batchId === batch.id && l.wordIds.length).sort((a, b) => b.at - a.at).find(l => {
    const p = lessonProgress(batch, l, attempts, introductions);
    return p.total > 0 && !p.finished;
  });
}

export const unseenWords = (batch, attempts, introductions) => { const index = learningIndex(attempts, introductions); return coreWords(batch).filter(w => !wordProgress(w, index).introduced); };
export const unseenProfi = (batch, attempts, introductions) => { const index = learningIndex(attempts, introductions); return profiWords(batch).filter(w => !wordProgress(w, index).introduced); };

// Etappen in calendar order, the family's own lists after them.
export const weekOrder = batches => [...batches].sort((a, b) => (a.week ?? 1000) - (b.week ?? 1000));

// Where working ahead continues: the current Etappe while it has new words, then the next one with new words.
export function aheadPackage(batches, batch, attempts, introductions) {
  if (unseenWords(batch, attempts, introductions).length) return batch;
  const ordered = weekOrder(batches), from = ordered.findIndex(b => b.id === batch.id);
  return ordered.slice(from + 1).find(b => unseenWords(b, attempts, introductions).length) || null;
}

// The year at a glance: an Etappe counts as done once every core word was written without help.
export function yearProgress(batches, attempts = [], introductions = [], now = Date.now()) {
  const index = learningIndex(attempts, introductions);
  const weeks = weekOrder(batches).filter(b => b.week).map(batch => {
    const words = coreWords(batch).map(w => wordProgress(w, index, now));
    const written = words.filter(w => w.written).length, introduced = words.filter(w => w.introduced).length;
    return { batch, total: words.length, written, introduced, done: words.length > 0 && written === words.length };
  });
  return { weeks, done: weeks.filter(w => w.done).length, started: weeks.filter(w => w.introduced > 0 && !w.done).length,
    words: weeks.reduce((n, w) => n + w.written, 0), totalWords: weeks.reduce((n, w) => n + w.total, 0) };
}

// Splits n words into near-equal parts of about `size`; one word more is fine, never above `max`.
// Ten words by three give 4/3/3 instead of 3/3/3/1.
export function portionSizes(n, size, max = size + 1) {
  if (n <= 0 || size <= 0) return [];
  const parts = Math.max(1, Math.round(n / size), Math.ceil(n / Math.min(size + 1, max)));
  return Array.from({ length: parts }, (_, i) => Math.floor(n / parts) + (i < n % parts ? 1 : 0));
}

export function selectDailyWords(batch, attempts, introductions, limit = 5) {
  const unseen = unseenWords(batch, attempts, introductions);
  return unseen.slice(0, portionSizes(unseen.length, Math.min(10, limit), 10)[0] || 0).map(w => w.id);
}

// Today's portion as the server reserves it; `previous` is the portion already stored for today.
// Returns the portion, whether it must be saved, or why nothing can be reserved.
/** @returns {{ lesson?: import('./types').Lesson; save?: boolean; error?: string }} */
export function planPortion(state, batch, previous, workAhead = false, now = Date.now()) {
  const day = learningDay(now), id = 'lesson:' + day, limit = state.settings.dailyNewLimit;
  const lesson = wordIds => ({ lesson: { id, day, batchId: batch.id, wordIds, limit, at: previous?.at || now }, save: true });
  const pending = previous ? null : activeLesson(state.lessons, batch, state.attempts, state.introductions, now);
  // Working ahead: once the current portion is fully introduced, today's portion takes the next new words of the
  // Etappe. A resumed earlier portion of the same Etappe is carried into today's. Asked for in another Etappe,
  // today's portion moves there; met words of the first one keep coming back as review.
  if (workAhead) {
    const base = previous || pending || null, baseBatch = base && state.batches.find(b => b.id === base.batchId);
    if (base?.batchId === batch.id && baseBatch && lessonProgress(baseBatch, base, state.attempts, state.introductions).introduced < base.wordIds.length) return { lesson: base };
    const fresh = selectDailyWords(batch, state.attempts, state.introductions, limit);
    if (!fresh.length) return { error: 'Every word of this package is introduced' };
    return lesson([...new Set([...(base?.batchId === batch.id ? base.wordIds : []), ...fresh])]);
  }
  if (pending) return { lesson: pending };
  const started = previous && state.introductions.some(a => previous.wordIds.includes(a.wordId));
  if (previous?.batchId === batch.id && (previous.limit === limit || started)) return { lesson: previous };
  const used = [...new Set(state.introductions.filter(a => learningDay(a.at) === day).map(a => a.wordId))];
  // Once introduced, a word keeps its place in today's allowance across devices and pace changes.
  if (used.some(id => !batch.words.some(w => w.id === id))) return { error: 'Today already started in another package' };
  return lesson([...new Set([...used, ...(used.length < limit ? selectDailyWords(batch, state.attempts, state.introductions, limit - used.length) : [])])]);
}

export function reviewWords(batches, attempts, introductions, count, exclude = [], skill = 'write', random = Math.random, now = Date.now(), dueOnly = false) {
  const index = learningIndex(attempts, introductions), seen = new Set(exclude), candidates = [], today = learningDay(now);
  for (const b of batches) for (const word of b.words) {
    if (seen.has(word.id)) continue; seen.add(word.id);
    const progress = wordProgress(word, index, now, skill); if (!progress.introduced) continue;
    // A Groß-/Kleinschreibung slip comes back on another day instead of in every round of the same day.
    const spelling = progress.spellingNeedsWork && learningDay(progress.latest.at) !== today;
    const urgent = progress.needsHelp || progress.overdue || spelling;
    if (dueOnly && !urgent && progress.latest) continue;
    const weight = progress.needsHelp ? 12 : progress.overdue ? 8 : spelling ? 5 : !progress.latest ? 2 : .25;
    candidates.push({ word: { ...word, batchId: b.id }, urgent, key: Math.max(Number.MIN_VALUE, random()) ** (1 / weight) });
  }
  return candidates.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.key - a.key).slice(0, count).map(x => x.word);
}
// Known words that are due for writing again: the warm-up at the start of a training.
export const dueWords = (batches, attempts, introductions, now = Date.now()) => reviewWords(batches, attempts, introductions, 50, [], 'write', () => .5, now, true);

export const reviewMix = {
  low: { current: 6, ratio: .25 },
  normal: { current: 5, ratio: .5 },
  high: { current: 4, ratio: 1 },
};

export function roundWords(batch, batches, attempts, introductions, lesson, mode, focusIds = [], random = Math.random, reviewLevel = 'normal') {
  const index = learningIndex(attempts, introductions), max = ROUND_MAX[mode] || 6, skill = attemptMode(mode);
  if (mode === 'warmup') return reviewWords(batches, attempts, introductions, max, [], 'write', random, Date.now(), true);
  if (mode === 'profi') return unseenProfi(batch, attempts, introductions).slice(0, max).map(w => ({ ...w, batchId: batch.id }));
  if (mode === 'mix') return reviewWords(batches, attempts, introductions, max, [], skill === 'discover' ? 'write' : skill, random);
  if (focusIds.length) {
    const seen = new Set();
    return batches.flatMap(b => b.words.map(w => ({ ...w, batchId: b.id }))).filter(w => focusIds.includes(w.id) && !seen.has(w.id) && seen.add(w.id) && wordProgress(w, index).introduced).slice(0, max);
  }
  const selected = coreWords(batch).filter(w => (lesson?.batchId === batch.id ? lesson.wordIds : []).includes(w.id));
  const eligible = selected.filter(w => wordProgress(w, index).introduced);
  if (mode === 'discover') {
    // Getting to know never repeats words that were already answered correctly; only shaky ones may come back.
    const unseen = selected.filter(w => !wordProgress(w, index).introduced);
    const shaky = selected.filter(w => { const p = wordProgress(w, index); return !p.ruled && !p.written && p.all.some(a => a.kind === 'incorrect'); });
    const words = unseen.length ? unseen : shaky;
    return words.slice(0, portionSizes(words.length, max, max)[0] || 0).map(w => ({ ...w, batchId: batch.id }));
  }
  // Finish every word of larger portions instead of repeatedly drawing the first ones. Then come met words of the
  // Etappe that still miss this step, so every round can move the Etappe's bars.
  const done = w => wordProgress(w, index)[SKILL[skill]];
  const pending = [...eligible, ...coreWords(batch).filter(w => !selected.includes(w) && wordProgress(w, index).introduced)].filter(w => !done(w));
  const mix = reviewMix[reviewLevel] || reviewMix.normal, slots = Math.min(mix.current, max);
  // One word more beats a follow-up round for a single word.
  const current = pending.slice(0, pending.length === slots + 1 ? Math.min(max, pending.length) : slots).map(w => ({ ...w, batchId: batch.id }));
  // Review words for a step come from Etappen where that step exists (no Hörlabor for das/dass), shaky and due
  // words first, never the finished portion. With few focus words left, more review keeps the round as long as a
  // regular one; early in the year the portion may be all there is to review.
  const pool = batches.filter(b => stepsOf(b).includes(skill));
  const size = current.length ? Math.min(max, Math.max(6, current.length + Math.ceil(current.length * mix.ratio))) : max;
  const review = reviewWords(pool, attempts, introductions, size - current.length, [...selected.map(w => w.id), ...current.map(w => w.id)], skill, random);
  const more = reviewWords(pool, attempts, introductions, size - current.length - review.length, [...current, ...review].map(w => w.id), skill, random);
  return [...current, ...review, ...more];
}

export const pointsFor = (kind, first, combo) => kind === 'incorrect' ? 0 : first ? 10 + (kind === 'exact' ? 2 : 0) + Math.min(5, Math.max(0, combo - 1)) : 3;
// Points are stored with every answer from day one, so the later game can spend them.
export function rewardBalance(sessions = [], attempts = []) {
  return sessions.reduce((n, s) => n + (s.completionBonus || 0), 0) + attempts.reduce((n, a) => n + (a.points || 0), 0);
}

// Day keys come from learningDay (Europe/Berlin); calendar arithmetic stays in UTC so DST never skips a day.
const shiftKey = (key, days) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10); };
const weekdayOf = key => (new Date(key + 'T12:00:00Z').getUTCDay() + 6) % 7;
const mondayOf = key => shiftKey(key, -weekdayOf(key));
// A training counts once a writing round is finished that day (the end of the path), or in Satzland
// a round of setting commas, a text or a Grenzfest.
const TRAINING_ROUNDS = ['write', 'warmup', 'satz-setzen', 'satz-text', 'satz-fest'];
export const trainingDays = sessions => new Set(sessions.filter(s => TRAINING_ROUNDS.includes(s.mode) && s.completed !== false).map(s => learningDay(s.at)));
/** Lotta trains two or three times a week, so the goal is weekly: trainings this week and weeks in a row. */
export function weeklyGoal(sessions, goal = 2, now = Date.now()) {
  const days = trainingDays(sessions), today = learningDay(now), monday = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => { const key = shiftKey(monday, i); return { key, trained: days.has(key), today: key === today, weekday: i }; });
  const count = week.filter(d => d.trained).length;
  const metIn = start => Array.from({ length: 7 }, (_, i) => shiftKey(start, i)).filter(k => days.has(k)).length >= goal;
  // An unfinished week does not break the series yet; it just has not grown.
  let streak = 0;
  for (let start = metIn(monday) ? monday : shiftKey(monday, -7); metIn(start); start = shiftKey(start, -7)) streak++;
  return { goal, count, met: count >= goal, trainedToday: days.has(today), week, streak };
}

/** @param {import('./types').Session[]} sessions @param {import('./types').Attempt[]} attempts @param {import('./types').TestResult[]} tests @param {string[] | null} wordIds */
export function sessionActivity(sessions, attempts, tests, wordIds = null) {
  const ids = wordIds && new Set(wordIds), match = a => !ids || ids.has(a.wordId);
  const answers = attempts.filter(match), sessionIds = new Set(answers.map(a => a.sessionId));
  const rounds = sessions.filter(s => !ids || sessionIds.has(s.id) || s.wordIds?.some(id => ids.has(id)));
  const exams = tests.filter(t => !ids || t.answers?.some(match));
  const completed = new Set([...rounds.map(s => s.id), ...exams.map(t => t.id)]);
  const partial = answers.filter(a => !completed.has(a.sessionId));
  const fraction = wordIds => !ids || !wordIds?.length ? 1 : wordIds.filter(id => ids.has(id)).length / wordIds.length;
  const seconds = rounds.reduce((n, s) => n + (s.duration || 0) * fraction(s.wordIds), 0) + exams.reduce((n, t) => n + (t.duration || 0) * fraction(t.answers?.map(a => a.wordId)), 0) + partial.reduce((n, a) => n + Math.min(300, a.seconds || 0), 0);
  return { rounds, exams, answers, seconds, days: new Set([...rounds.map(s => s.at), ...answers.map(a => a.at)].map(learningDay)).size };
}

// Which Knackstellen cause the most trouble: the basis for the parents' advice and Schreibi's suggestions.
export function trickySpots(attempts, since = 0) {
  const counts = new Map();
  for (const a of attempts) {
    if (a.at < since || !a.knack || a.kind !== 'incorrect' || a.guided) continue;
    const entry = counts.get(a.knack) || { key: a.knack, count: 0, words: new Set() };
    entry.count++; entry.words.add(a.expected); counts.set(a.knack, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).map(e => ({ ...e, words: [...e.words] }));
}

// What the round that just ended changed in the portion: the next step opened or everything is done.
export function portionCheer(before, after, mode) {
  if (!after.total) return null;
  if (mode === 'discover' && before.introduced < after.total && after.introduced === after.total) return 'introduced';
  const next = after.steps[after.steps.indexOf(mode) + 1];
  if (next && !before.open[next] && after.open[next]) return 'opened:' + next;
  if (!before.complete && after.complete) return 'complete';
  if (mode === 'write' && before.written < after.total && after.written === after.total) return 'written';
  return null;
}
