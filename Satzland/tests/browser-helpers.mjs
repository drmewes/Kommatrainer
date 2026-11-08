// Shared fixtures for browser checks: API calls are answered in memory, so no real learner data changes.
import { chromium } from '@playwright/test';
import { packageState } from '../app/lib/curriculum.mjs';
import { materialize } from '../app/lib/engine.mjs';
import { learningDay, planPortion } from '../app/lib/learning.mjs';

export const BASE = process.env.SCHREIBI_URL || 'http://127.0.0.1:5176';

export async function launch() {
  // A local Chrome works when Playwright's own browser is not installed.
  try { return await chromium.launch({ headless: true }); } catch { return chromium.launch({ headless: true, channel: 'chrome' }); }
}

export function setting(key, value) { return ['setting:' + key, { id: 'setting:' + key, kind: 'setting', data: { key, value } }]; }

/** @param {import('@playwright/test').Browser} browser */
export async function openApp(browser, { records = new Map(), viewport = { width: 1280, height: 900 }, pinSet = true } = {}) {
  for (const [key, value] of Object.entries({ sound: false, effects: false, childName: 'Lotta', tutorialWelcomeSeen: true })) if (!records.has('setting:' + key)) records.set(...setting(key, value));
  const context = await browser.newContext({ viewport });
  await context.route('**/api/records*', async route => {
    if (route.request().method() === 'POST') {
      const rows = route.request().postDataJSON().records; for (const row of rows) records.set(row.id, row);
      await route.fulfill({ json: { accepted: rows.map(r => r.changeId) } });
    } else await route.fulfill({ json: { records: [...records.values()], now: Date.now() } });
  });
  await context.route('**/api/parent-pin', route => route.fulfill({ json: route.request().method() === 'POST' ? { ok: true } : { pinSet } }));
  await context.route('**/api/lesson', async route => {
    const input = route.request().postDataJSON(), state = packageState(materialize([...records.values()], [])), id = 'lesson:' + learningDay();
    const result = planPortion(state, state.batches.find(b => b.id === input.batchId), records.get(id)?.data || null, input.workAhead);
    if (result.error) return route.fulfill({ status: 409, json: { error: result.error } });
    if (result.save) records.set(id, { id, kind: 'lesson', data: result.lesson });
    await route.fulfill({ json: { lesson: result.lesson } });
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE + '/signin-with-chatgpt?return_to=/');
  return { context, page, records, errors };
}

// An Etappe whose core words are fully practised, so its check is open.
export function practisedWeek(records, batch, { at = Date.now(), wrong = [] } = {}) {
  const key = word => JSON.stringify([word.id, word.text]);
  for (const word of batch.words.filter(w => !w.profi)) {
    records.set('intro:' + word.id, { id: 'intro:' + word.id, kind: 'introduction', data: { id: 'intro:' + word.id, wordId: word.id, batchId: batch.id, at, contentKey: key(word) } });
    for (const mode of ['listen', 'rule', 'morph', 'write']) {
      const id = mode + ':' + word.id, bad = wrong.includes(word.text) && mode === 'write';
      records.set(id, { id, kind: 'attempt', data: { id, wordId: word.id, batchId: batch.id, sessionId: 's-' + mode, mode, input: bad ? word.text.slice(0, -1) : word.text, expected: word.text, kind: bad ? 'incorrect' : 'exact', distance: bad ? 1 : 0, first: true, hint: false, at, seconds: 3, contentKey: key(word), points: 10, knack: bad ? 'e' : null } });
    }
  }
  records.set('s-write', { id: 's-write', kind: 'session', data: { id: 's-write', batchId: batch.id, mode: 'write', at, score: 100, exact: batch.words.length, correct: batch.words.length, total: batch.words.length, points: 80, wordIds: batch.words.map(w => w.id), duration: 200, completed: true } });
  return records;
}
