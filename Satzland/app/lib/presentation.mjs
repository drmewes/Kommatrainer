// Display order only. The curriculum and daily selection retain their teaching order.
/** @template {{id: string, week?: number}} T @param {T[]} batches @param {string} activeId @returns {T[]} */
export function currentBatchesFirst(batches, activeId = '') {
  return batches.map((batch, index) => ({ batch, index })).sort((a, b) => {
    const active = Number(b.batch.id === activeId) - Number(a.batch.id === activeId);
    if (active) return active;
    const aWeek = Number.isFinite(a.batch.week), bWeek = Number.isFinite(b.batch.week);
    if (aWeek && bWeek) return b.batch.week - a.batch.week || b.index - a.index;
    // Other packages are supplied after the curriculum; show them in reverse order.
    if (aWeek !== bWeek) return Number(aWeek) - Number(bWeek);
    return b.index - a.index;
  }).map(item => item.batch);
}

// School-year order: the current week first, then the coming weeks, then earlier ones; own lists at the end.
/** @template {{id: string, week?: number}} T @param {T[]} batches @param {string} activeId @returns {T[]} */
export function planOrder(batches, activeId = '') {
  const active = batches.find(b => b.id === activeId), from = active?.week ?? 0;
  const rank = b => b.id === activeId ? -1 : !Number.isFinite(b.week) ? 1000 : b.week > from ? b.week : 100 + b.week;
  return [...batches].sort((a, b) => rank(a) - rank(b));
}

/** @template {{at?: number | null}} T @param {T[]} items @returns {T[]} */
export function newestFirst(items) {
  return [...items].sort((a, b) => (b.at || 0) - (a.at || 0));
}

/** @param {import('./types').Session[]} rounds @param {import('./types').TestResult[]} tests */
export function activityTimeline(rounds, tests) {
  return newestFirst([
    ...rounds.map(round => ({ id: round.id, at: round.at, round })),
    ...tests.map(test => ({ id: test.id, at: test.at, test })),
  ]);
}

/** @param {import('./types').Attempt[]} answers */
export function testReviewGroups(answers) {
  const rows = answers.map((answer, index) => ({ answer, index }));
  return {
    practice: rows.filter(r => r.answer.kind !== 'exact').sort((a, b) => Number(a.answer.kind === 'tolerated') - Number(b.answer.kind === 'tolerated')),
    perfect: rows.filter(r => r.answer.kind === 'exact'),
  };
}
