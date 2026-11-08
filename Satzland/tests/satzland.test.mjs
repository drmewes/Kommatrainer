import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCommas, checkKings, decisionScore, explain, kingCount, parseSentence, pickText, regionProgress, regions, regionSteps, roundSentences, withCommas } from '../app/lib/satzland.mjs';

const built = regions.filter(r => r.built);
const sentencesOf = r => [...r.examples, ...r.sentences, ...r.profi, ...r.texts.flatMap(t => t.sentences), ...r.fest.sentences];
const all = built.flatMap(sentencesOf);

test('every Satzland sentence parses, has a king and a sentence end', () => {
  assert.ok(built.length >= 7);
  assert.equal(new Set(all.map(s => s.id)).size, all.length);
  for (const s of all) {
    assert.ok(kingCount(s) >= 1, s.id + ' hat keinen König');
    assert.ok(/[.?!]$/.test(s.text), s.id);
    assert.equal(s.gaps.length, s.words.length - 1, s.id);
    // Every word belongs to a kingdom, except a bridge between two of them.
    s.words.forEach((w, i) => assert.ok(s.kingdoms[i] > 0 || s.bridge[i], `${s.id}: „${w.text}“ ohne Königreich`));
    // Two kings may only share a stretch without comma when the bridge und/oder connects them.
    s.gaps.forEach((g, i) => { if (g === 'no' && s.kinds[i] === 'innen') assert.equal(s.kingdoms[i], s.kingdoms[i + 1], `${s.id}: Grenze ohne Komma nach „${s.words[i].text}“`); });
    // Sentences stay readable for a child with LRS.
    assert.ok(s.words.length <= 16, s.id + ' ist zu lang');
  }
});

test('regions are built in order with enough sentences, Profi sentences and texts', () => {
  for (const r of built) {
    if (!r.textsOnly) { assert.ok(r.sentences.length >= 10, r.name); assert.ok(r.profi.length >= 4, r.name); }
    assert.ok(r.texts.length >= 1 && r.fest.sentences.length >= 4, r.name);
    assert.equal(r.examples.length, 3, r.name);
    if (r.kind === 'kommas' && !r.textsOnly) {
      const without = r.sentences.filter(s => !s.gaps.includes('yes')).length;
      // About a third of the sentences need no comma, so the rule is not "long sentence → comma".
      assert.ok(without >= 2 && without <= r.sentences.length / 2, `${r.name}: ${without} Sätze ohne Komma`);
    }
  }
  assert.deepEqual(regions.map(r => r.n), regions.map((_, i) => i + 1));
});

test('each region practises its own kind of border', () => {
  const kinds = r => new Set(r.sentences.flatMap(s => s.kinds.filter((k, i) => s.gaps[i] === 'yes')));
  const byName = name => built.find(r => r.name === name);
  assert.deepEqual([...kinds(byName('Der Thronsaal'))], []);
  assert.deepEqual([...kinds(byName('Der Marktplatz'))], ['liste']);
  assert.ok(kinds(byName('Die Zwillingstäler')).has('gegen') && kinds(byName('Die Zwillingstäler')).has('grenze'));
  assert.deepEqual([...kinds(byName('Die Tore'))], ['tor']);
  assert.deepEqual([...kinds(byName('Die Königskreuzung'))], ['treffen']);
});

test('kingdoms, bridges and explanations', () => {
  const s = parseSentence('Ich [putze] mir die Zähne, [ziehe] meinen Schlafanzug [+an] und [gehe] ins Bett.');
  assert.deepEqual(s.kingdoms, [1, 1, 1, 1, 1, 2, 2, 2, 2, 0, 3, 3, 3]);
  assert.equal(s.kinds[4], 'grenze');
  assert.match(explain(s, 4, false), /putze.*ziehe … an/);
  assert.equal(s.kinds[8], 'bruecke');
  const enclave = parseSentence('Der Hund, der dort [2:bellt], [1:heißt] Bello.');
  assert.deepEqual(enclave.kingdoms, [1, 1, 2, 2, 2, 1, 1]);
  const free = parseSentence('Lena [liest] ein Buch(,) und ihr Bruder [hört] Musik.');
  assert.equal(checkCommas(free, new Set([3])).correct, true);
  assert.equal(checkCommas(free, new Set()).correct, true);
  assert.throws(() => parseSentence('Ohne Ende'), /Satzschlusszeichen/);
  assert.throws(() => parseSentence('[+an] fängt es.'), /ohne König/);
});

test('checking posts and kings', () => {
  const s = parseSentence('Wenn es [regnet], [bleiben] wir drinnen.');
  assert.equal(s.text, 'Wenn es regnet, bleiben wir drinnen.');
  assert.equal(s.plain, 'Wenn es regnet bleiben wir drinnen.');
  const wrong = checkCommas(s, new Set([0]));
  assert.deepEqual(wrong.marks, ['extra', 'ok', 'missing', 'ok', 'ok']);
  assert.equal(withCommas(s, new Set([0])), 'Wenn, es regnet bleiben wir drinnen.');
  assert.equal(decisionScore([wrong]), 0);
  assert.equal(decisionScore([checkCommas(s, new Set([2]))]), 100);
  assert.equal(checkKings(s, new Set([2, 3])).correct, true);
  assert.deepEqual(checkKings(s, new Set([2, 4])).marks, ['ok', 'ok', 'hit', 'missing', 'extra', 'ok']);
});

test('steps open one after the other and the Grenzfest frees a region', () => {
  const r = built.find(x => x.name === 'Der Marktplatz'), at = Date.now();
  assert.deepEqual(regionSteps(r), ['satz-lernen', 'satz-koenige', 'satz-grenzweg', 'satz-setzen', 'satz-text', 'satz-fest']);
  let p = regionProgress(r, [], []);
  assert.deepEqual([p.open['satz-lernen'], p.open['satz-koenige'], p.next], [true, false, 'satz-lernen']);
  const sessions = [{ id: 'l', batchId: r.id, mode: 'satz-lernen', at, completed: true }];
  const attempts = r.sentences.slice(0, 6).map((s, i) => ({ id: 'a' + i, wordId: s.id, batchId: r.id, mode: 'satz-koenige', kind: 'exact', first: true, hint: false, at }));
  p = regionProgress(r, attempts, sessions);
  assert.equal(p.open['satz-grenzweg'], true);
  assert.equal(p.next, 'satz-grenzweg');
  assert.equal(regionProgress(r, attempts, [...sessions, { id: 'f', batchId: r.id, mode: 'satz-fest', at, stars: 2, completed: true }]).freed, true);
  // Unsolved sentences come first.
  const round = roundSentences(r, 'satz-koenige', attempts, () => .3);
  assert.ok(round.every(s => !attempts.some(a => a.wordId === s.id)));
  assert.equal(pickText(r, []).id, r.texts[0].id);
});
