// Satzland: sentences, kings, kingdoms and border posts (commas). Everything a task needs is derived from
// the sentence lines in app/data/satzland.mjs, so new sentences get the same help and explanations.
import { regions as rawRegions, STORY } from '../data/satzland.mjs';
import { shuffle } from './words.mjs';

export { STORY };
// Words that bridge two kingdoms or two listed things: no comma needed.
export const BRIDGES = new Set(['und', 'oder']);
// Words that open a new kingdom whose king stands at the end (subordinating conjunctions).
export const TORWOERTER = new Set(['weil', 'dass', 'wenn', 'ob', 'als', 'damit', 'obwohl', 'nachdem', 'bevor', 'während', 'bis', 'seit', 'seitdem', 'falls', 'sobald', 'sodass']);
// Before these a new kingdom starts with a border post.
export const GEGENWOERTER = new Set(['aber', 'denn', 'doch', 'sondern']);

const TOKEN = /^(?:\[(?:(\d+):|(\+))?([^\]\s]+)\]|([^[\]\s(,.?!]+))(\(,\)|,)?([.?!])?$/;

/** Parses one sentence line. Throws on anything the format does not allow, so the tests catch typos. */
export function parseSentence(line, id = '') {
  const tokens = line.trim().split(/\s+/), words = [], gaps = [];
  let counter = 0, last = 0, end = '';
  tokens.forEach((token, i) => {
    const m = token.match(TOKEN);
    if (!m) throw new Error(`Satz ${id}: „${token}“ passt nicht zum Format`);
    const [, number, plus, kingText, plainText, comma, stop] = m;
    let king = null;
    if (kingText) {
      if (plus) { if (!last) throw new Error(`Satz ${id}: [+${kingText}] ohne König davor`); king = last; }
      else if (number) { king = Number(number); counter = Math.max(counter, king); }
      else king = ++counter;
      last = king;
    }
    words.push({ text: kingText || plainText, king });
    if (stop) { if (i !== tokens.length - 1) throw new Error(`Satz ${id}: Satzzeichen mitten im Satz`); end = stop; }
    else if (i < tokens.length - 1) gaps.push(comma === '(,)' ? 'optional' : comma ? 'yes' : 'no');
    else throw new Error(`Satz ${id}: Satzschlusszeichen fehlt`);
  });
  const kingdoms = assignKingdoms(words, gaps);
  const sentence = { id, line, words, gaps, end, kingdoms: kingdoms.kingdom, bridge: kingdoms.bridge };
  return { ...sentence, kinds: gaps.map((truth, i) => gapKind(sentence, i)), text: render(sentence, i => sentence.gaps[i] === 'yes'), plain: render(sentence, () => false) };
}

// Every word gets the kingdom of its king. Segments between commas belong together; a segment with two
// kings splits at the bridge „und“/„oder“. Segments without a king (listed things) join the kingdom before.
function assignKingdoms(words, gaps) {
  const segments = [[]];
  words.forEach((w, i) => { segments.at(-1).push(i); if (i < gaps.length && gaps[i] !== 'no') segments.push([]); });
  const parts = [], bridge = words.map(() => false);
  for (const segment of segments) {
    let current = [], king = null;
    segment.forEach((i, k) => {
      const w = words[i];
      if (BRIDGES.has(w.text.toLowerCase()) && king !== null) {
        const nextKing = segment.slice(k + 1).map(j => words[j].king).find(x => x !== null);
        if (nextKing !== undefined && nextKing !== king) { parts.push({ ids: current, king }); bridge[i] = true; current = []; king = null; return; }
      }
      current.push(i); if (king === null && w.king !== null) king = w.king;
    });
    parts.push({ ids: current, king });
  }
  const kingdom = words.map(() => 0);
  parts.forEach((part, p) => {
    let k = part.king;
    if (k === null) k = parts.slice(0, p).reverse().find(x => x.king !== null)?.king ?? null;
    if (k === null) k = Math.min(...parts.slice(p + 1).map(x => x.king).filter(x => x !== null));
    for (const i of part.ids) kingdom[i] = k;
  });
  // A bridge word takes the colour of nothing; its neighbours tell the story.
  bridge.forEach((b, i) => { if (b) kingdom[i] = 0; });
  return { kingdom, bridge };
}

const kingdomOf = (s, i, side) => { let j = i; while (s.kingdoms[j] === 0 && j >= 0 && j < s.words.length) j += side; return s.kingdoms[j] || 0; };
/** Why a gap needs a border post or not. */
function gapKind(s, i) {
  const truth = s.gaps[i], left = s.words[i], right = s.words[i + 1], r = right.text.toLowerCase(), l = left.text.toLowerCase();
  if (truth === 'optional') return 'frei';
  const kl = kingdomOf(s, i, -1), kr = kingdomOf(s, i + 1, 1);
  if (truth === 'yes') {
    if (kl === kr) return 'liste';
    if (TORWOERTER.has(r)) return 'tor';
    if (GEGENWOERTER.has(r)) return 'gegen';
    if (left.king !== null && right.king !== null) return 'treffen';
    return 'grenze';
  }
  if (BRIDGES.has(r) || BRIDGES.has(l)) return 'bruecke';
  return 'innen';
}

const render = (s, comma) => s.words.map((w, i) => w.text + (i < s.gaps.length && comma(i) ? ',' : '')).join(' ') + s.end;
export const kingWords = (s, kingdom) => s.words.filter(w => w.king === kingdom).map(w => w.text).join(' … ');
export const kingCount = s => new Set(s.words.map(w => w.king).filter(k => k !== null)).size;
export const kingIndices = s => s.words.map((w, i) => w.king !== null ? i : -1).filter(i => i >= 0);
export const needsComma = s => s.gaps.some(g => g === 'yes');
/** The sentence with the commas Lotta set. */
export const withCommas = (s, set) => render(s, i => set.has(i));

/** Schreibi's explanation for one gap; `set` tells whether Lotta put a post there. */
export function explain(s, i, set) {
  const kind = s.kinds[i], left = s.words[i].text, right = s.words[i + 1].text;
  const kl = kingdomOf(s, i, -1), kr = kingdomOf(s, i + 1, 1);
  switch (kind) {
    case 'liste': return set ? 'Richtig: Hier wird aufgezählt, dazwischen steht ein Grenzposten.' : `Hier wird aufgezählt: „${left}“ und dann etwas Neues. Zwischen den Dingen steht ein Grenzposten.`;
    case 'tor': return `„${right}“ ist ein Torwort. Vor dem Tor steht ein Grenzposten.`;
    case 'gegen': return `Vor „${right}“ beginnt ein neues Königreich. Vor aber, denn, doch und sondern steht immer ein Grenzposten.`;
    case 'treffen': return `Hier treffen zwei Könige aufeinander: „${left}“ und „${right}“. Dazwischen gehört ein Grenzposten.`;
    case 'grenze': return `Hier endet das Reich von „${kingWords(s, kl)}“ und das Reich von „${kingWords(s, kr)}“ beginnt. Dazwischen steht ein Grenzposten.`;
    case 'bruecke': return '„und“ und „oder“ sind Brücken. Hier braucht es keinen Grenzposten.';
    case 'frei': return 'Hier darfst du einen Grenzposten setzen, musst aber nicht: Vor „und“ oder „oder“ zwischen zwei Königreichen ist beides richtig.';
    default: return `Hier bist du mitten im Reich von „${kingWords(s, kl)}“. Ein Grenzposten würde das Volk von seinem König trennen.`;
  }
}

/** @typedef {{ marks: string[], errors: number, needed: number, hits: number, extras: number, correct: boolean }} Check */
/** Compares Lotta's posts with the sentence: per gap hit, missing, extra, free or ok.
 * @param {ReturnType<typeof parseSentence>} s @param {Set<number>} set @returns {Check} */
export function checkCommas(s, set) {
  const marks = s.gaps.map((truth, i) => truth === 'yes' ? set.has(i) ? 'hit' : 'missing' : truth === 'optional' ? set.has(i) ? 'free' : 'ok' : set.has(i) ? 'extra' : 'ok');
  const errors = marks.filter(m => m === 'missing' || m === 'extra').length;
  return { marks, errors, needed: s.gaps.filter(g => g === 'yes').length, hits: marks.filter(m => m === 'hit').length, extras: marks.filter(m => m === 'extra').length, correct: errors === 0 };
}
/** Compares the tapped kings with the sentence: per word hit, missing, extra or ok.
 * @param {ReturnType<typeof parseSentence>} s @param {Set<number>} set @returns {Check} */
export function checkKings(s, set) {
  const marks = s.words.map((w, i) => w.king !== null ? set.has(i) ? 'hit' : 'missing' : set.has(i) ? 'extra' : 'ok');
  const errors = marks.filter(m => m === 'missing' || m === 'extra').length;
  return { marks, errors, needed: kingIndices(s).length, hits: marks.filter(m => m === 'hit').length, extras: marks.filter(m => m === 'extra').length, correct: errors === 0 };
}
/** Share of decisions that were right: every needed post counts, every extra post costs.
 * @param {Check[]} results */
export const decisionScore = results => {
  const total = results.reduce((n, r) => n + r.needed + r.extras, 0), hits = results.reduce((n, r) => n + r.hits, 0);
  return total ? hits / total * 100 : 100;
};

/* ---------- Regions and progress ---------- */

const build = (region, list, prefix) => (list || []).map((line, i) => parseSentence(line, `${region.id}:${prefix}${i}`));
export const regions = rawRegions.map(r => r.kind === 'bald' ? { ...r, built: false } : {
  ...r, built: true,
  examples: build(r, r.examples, 'e'), sentences: build(r, r.sentences, 's'), profi: build(r, r.profi, 'p'),
  texts: r.texts.map((t, ti) => ({ id: `${r.id}:t${ti}`, title: t.title, sentences: build(r, t.sentences, `t${ti}.`) })),
  fest: { id: `${r.id}:f`, title: r.fest.title, sentences: build(r, r.fest.sentences, 'f') },
});
export const regionById = id => regions.find(r => r.id === id);

export const SATZ_MODES = ['satz-lernen', 'satz-koenige', 'satz-grenzweg', 'satz-setzen', 'satz-text', 'satz-fest'];
export const satzStepInfo = {
  'satz-lernen': { label: 'Kennenlernen', hint: 'Geschichte und Regel' },
  'satz-koenige': { label: 'Könige finden', hint: 'Wer regiert hier?' },
  'satz-grenzweg': { label: 'Grenzweg', hint: 'Schritt für Schritt zur Grenze' },
  'satz-setzen': { label: 'Grenzposten setzen', hint: 'Kommas selbst setzen' },
  'satz-text': { label: 'Textdetektiv', hint: 'Einen ganzen Text prüfen' },
  'satz-fest': { label: 'Grenzfest', hint: 'Der Check für dieses Gebiet' },
};
export const satzModeTitle = Object.fromEntries(Object.entries(satzStepInfo).map(([k, v]) => [k, 'Satzland: ' + v.label]));
export const isSatzMode = mode => typeof mode === 'string' && mode.startsWith('satz-');

export function regionSteps(region) {
  if (!region?.built) return [];
  if (region.kind === 'koenige') return ['satz-lernen', 'satz-koenige', 'satz-text', 'satz-fest'];
  if (region.textsOnly) return ['satz-lernen', 'satz-text', 'satz-fest'];
  return ['satz-lernen', 'satz-koenige', 'satz-grenzweg', 'satz-setzen', 'satz-text', 'satz-fest'];
}
const independent = a => a.first && !a.hint && a.kind === 'exact';
export const SENTENCE_STEPS = ['satz-koenige', 'satz-grenzweg', 'satz-setzen'];

/** How far Lotta is in a region: solved sentences per step, which steps are open and what comes next. */
export function regionProgress(region, attempts = [], sessions = []) {
  const ids = new Set(region.sentences?.map(s => s.id) || []), total = ids.size, half = Math.ceil(total / 2);
  const own = attempts.filter(a => a.batchId === region.id), rounds = sessions.filter(s => s.batchId === region.id && s.completed !== false);
  /** @type {Record<string, number>} */
  const solved = Object.fromEntries(SENTENCE_STEPS.map(mode => [mode, new Set(own.filter(a => a.mode === mode && ids.has(a.wordId) && independent(a)).map(a => a.wordId)).size]));
  const met = rounds.some(s => s.mode === 'satz-lernen'), texts = rounds.filter(s => s.mode === 'satz-text').length;
  const fests = rounds.filter(s => s.mode === 'satz-fest'), stars = Math.max(0, ...fests.map(s => s.stars || 0));
  /** @type {Record<string, boolean>} */
  const open = {};
  /** @type {Record<string, boolean>} */
  const done = {};
  const steps = regionSteps(region);
  steps.forEach((mode, i) => {
    const before = steps[i - 1];
    open[mode] = !before ? true : before === 'satz-lernen' ? met : SENTENCE_STEPS.includes(before) ? open[before] && solved[before] >= half : before === 'satz-text' ? texts > 0 : false;
    done[mode] = mode === 'satz-lernen' ? met : SENTENCE_STEPS.includes(mode) ? solved[mode] >= half : mode === 'satz-text' ? texts > 0 : stars > 0;
  });
  const next = steps.find(mode => open[mode] && !done[mode]) || null;
  const doneSteps = steps.filter(mode => done[mode]).length;
  return { total, half, solved, met, texts, stars, freed: stars > 0, steps, open, done, next, started: own.length > 0 || rounds.length > 0, share: steps.length ? doneSteps / steps.length : 0 };
}
/** The region Schreibi suggests on the map: the first built one that is not freed yet. */
export const nextRegion = (attempts, sessions) => regions.find(r => r.built && !regionProgress(r, attempts, sessions).freed) || regions.find(r => r.built);

export const ROUND_SIZE = { 'satz-koenige': 6, 'satz-grenzweg': 5, 'satz-setzen': 6 };
/** Sentences for a round: not yet solved in this step first, then the least practised ones. */
export function roundSentences(region, mode, attempts = [], random = Math.random) {
  const tries = new Map(), solved = new Set();
  for (const a of attempts) if (a.batchId === region.id && a.mode === mode) { tries.set(a.wordId, (tries.get(a.wordId) || 0) + 1); if (independent(a)) solved.add(a.wordId); }
  const order = shuffle(region.sentences, random).sort((a, b) => Number(solved.has(a.id)) - Number(solved.has(b.id)) || (tries.get(a.id) || 0) - (tries.get(b.id) || 0));
  return order.slice(0, ROUND_SIZE[mode] || 6);
}
/** The practice text that was used least; the Grenzfest has its own. */
export function pickText(region, sessions = []) {
  const used = id => sessions.filter(s => s.mode === 'satz-text' && s.wordIds?.some(w => w.startsWith(id + '.'))).length;
  return [...region.texts].sort((a, b) => used(a.id) - used(b.id))[0];
}
