import { builtinWords, gapFor, phenomena, rankedKnacks, shuffle, strategies, vowelInfo } from './words.mjs';

// The three exercise types that Fritzi does not have. Each builds a task from the word data alone, so the
// parents' own words get the same exercises.

/* ---------- Hörlabor: syllables, stress and vowel length, heard only (Prosodiya, Silben schwingen) ---------- */

export const lengthLabel = { lang: 'lang', kurz: 'kurz', zwie: 'Zwielaut' };
/** The steps of a listening task. The word is not shown until all steps are answered. */
export function listenTask(word, random = Math.random) {
  const v = vowelInfo(word), n = word.syllables.length, steps = [];
  if (word.pair) steps.push({ id: 'paar', question: 'Welches Wort hörst du?', options: shuffle([word.text, word.pair], random).map(value => ({ value, label: value })), answer: word.text });
  else if (n > 1) {
    steps.push({ id: 'silben', question: 'Wie viele Silben hörst du?', options: [1, 2, 3, 4, 5].filter(k => k <= Math.max(4, n + 1)).map(k => ({ value: String(k), label: String(k) })), answer: String(n) });
    steps.push({ id: 'betonung', question: 'Welche Silbe klingt am stärksten?', options: word.syllables.map((_, i) => ({ value: String(i), label: String(i + 1) })), answer: String(v.index), syllables: n });
  }
  steps.push({ id: 'laenge', question: n > 1 && !word.pair ? 'Ist der Selbstlaut in der starken Silbe lang oder kurz?' : 'Ist der Selbstlaut lang oder kurz?', options: [{ value: 'lang', label: 'lang' }, { value: 'kurz', label: 'kurz' }, { value: 'zwie', label: 'Zwielaut' }], answer: v.length });
  return { steps, vowel: v };
}
// What the length means for the spelling, shown after the answer.
export function lengthConsequence(word) {
  const v = vowelInfo(word), lower = word.text.toLowerCase(), next = lower.slice(v.to, v.to + 3);
  if (v.length === 'zwie') return `${v.nucleus} ist ein Zwielaut – danach wird nie verdoppelt.`;
  if (v.length === 'kurz') {
    const m = next.match(/^(bb|dd|ff|gg|ll|mm|nn|pp|rr|ss|tt|ck|tz)/);
    return m ? `Kurz – darum folgen zwei Mitlaute: ${m[0]}.` : 'Kurz – danach hörst du zwei verschiedene Mitlaute, also wird nicht verdoppelt.';
  }
  if (/^h/.test(next)) return 'Lang – hier steht ein h dahinter.';
  if (v.nucleus === 'ie') return 'Lang – langes i schreibt man ie.';
  if (/^ß/.test(next)) return 'Lang – darum ß.';
  return 'Lang – danach kommt nur ein Mitlaut.';
}

/* ---------- Regelweg: the rule as a decision path (Marburger Rechtschreibtraining, Faber's Lösungspläne) ---------- */

const yes = { value: 'ja', label: 'Ja' }, no = { value: 'nein', label: 'Nein' };
const yn = answer => ({ options: [yes, no], answer: answer ? 'ja' : 'nein' });
// Counted sounds after the stressed vowel: ck, tz, doubled letters, sch, ch and ng are one sound each.
export function consonantSounds(word) {
  const v = vowelInfo(word), rest = word.text.toLowerCase().slice(v.to).match(/^[^aeiouäöüy]*/)[0];
  return rest.replace(/sch/g, 'S').replace(/ch/g, 'C').replace(/ng/g, 'N').replace(/ck/g, 'k').replace(/tz/g, 'z').replace(/(.)\1/g, '$1').length;
}
const lengthStep = (word, why) => ({ id: 'laenge', question: 'Hör auf den betonten Selbstlaut: lang oder kurz?', options: [{ value: 'lang', label: 'lang' }, { value: 'kurz', label: 'kurz' }, { value: 'zwie', label: 'Zwielaut' }], answer: vowelInfo(word).length, why: why || `Schwing das Wort: ${word.syllables.join(' – ')}. Der Selbstlaut ist ${lengthLabel[vowelInfo(word).length]}.`, speak: true });
const oneOrMore = word => { const n = consonantSounds(word); return { id: 'mitlaute', question: 'Wie viele Mitlaute hörst du direkt danach?', options: [{ value: '1', label: 'nur einen' }, { value: '2', label: 'zwei oder mehr' }], answer: n <= 1 ? '1' : '2', why: n <= 1 ? 'Danach hörst du nur einen Mitlaut.' : 'Danach hörst du schon zwei verschiedene Mitlaute.' }; };

const flows = {
  // Kürzungsregel: kurz + nur ein Mitlaut hörbar → verdoppeln (k → ck, z → tz).
  doppel: word => [lengthStep(word), ...(vowelInfo(word).length === 'kurz' ? [oneOrMore(word)] : [])],
  ck: word => flows.doppel(word), tz: word => flows.doppel(word), einfach: word => flows.doppel(word), nachmitlaut: word => flows.doppel(word),
  ss: word => [lengthStep(word)],
  sz: word => [lengthStep(word), { id: 'zisch', question: 'Klingt das s scharf und zischend wie in Straße?', ...yn(true), why: 'Ja: ein scharfes s nach langem Selbstlaut oder Zwielaut ist ein ß.' }],
  stamm: word => word.help ? [lengthenStep(word, 'Verlängere das Wort oder such die Grundform. Was passt?'),
    { id: 'stammdoppel', question: `Hörst du in ${word.help} einen kurzen Selbstlaut mit nur einem Mitlaut danach?`, ...yn(true), why: `Ja – ${word.help} wird verdoppelt. Der Stamm behält die Verdopplung.`, speakText: word.help }] : [lengthStep(word)],
  ie: word => [lengthStep(word), ...(vowelInfo(word).length === 'lang' ? [{ id: 'merk', question: 'Ist es ein Merkwort aus einer anderen Sprache (wie Tiger)?', ...yn(false), why: 'Nein – dann schreibst du das lange i als ie.' }] : [])],
  imerk: word => [lengthStep(word), { id: 'merk', question: 'Ist es ein Merkwort aus einer anderen Sprache (wie Tiger)?', ...yn(true), why: `Ja – ${word.text} ist ein Merkwort: langes i ohne e.` }],
  ih: () => [{ id: 'familie', question: 'Gehört das Wort zur Familie ihm, ihn, ihr?', ...yn(true), why: 'Ja – die ganze Familie schreibt man mit ih.' }],
  wieder: word => { const again = /^wied/i.test(word.text); return [{ id: 'bedeutung', question: 'Was bedeutet das Wort hier?', options: [{ value: 'noch', label: 'noch einmal' }, { value: 'gegen', label: 'gegen' }], answer: again ? 'noch' : 'gegen', why: again ? 'Es heißt „noch einmal“ – also wieder mit ie.' : 'Es heißt „gegen“ – also wider mit i.' }]; },
  dehnung: word => [lengthStep(word), { id: 'lmnr', question: 'Folgt danach ein l, m, n oder r?', ...yn(true), why: 'Ja – nur dort kann ein Dehnungs-h stehen.' }, ...(word.family?.length ? [relativeStep(word)] : [])],
  ohneh: word => [lengthStep(word), { id: 'lmnr', question: 'Folgt danach ein l, m, n oder r?', ...yn(true), why: 'Ja – hier könnte ein h stehen. Muss aber nicht!' }],
  silbenh: word => [{ id: 'silben', question: word.help ? `Verlängere: ${word.help}. Hörst du jetzt zwei Silben mit h dazwischen?` : `Schwing: ${word.syllables.join(' – ')}. Hörst du das h am Anfang der zweiten Silbe?`, ...yn(true), why: `Ja – ${word.help || word.syllables.join(' – ')}: Da ist das h.`, speakText: word.help }],
  doppelvokal: word => [lengthStep(word), { id: 'welche', question: 'Welche Selbstlaute können doppelt stehen?', options: [{ value: 'aeo', label: 'a, e, o' }, { value: 'iu', label: 'i, u' }], answer: 'aeo', why: 'Nur a, e und o – und das sind immer Merkwörter.' }],
  auslaut: word => word.help ? [lengthenStep(word, 'Mach das Wort länger. Was passt?')] : [],
  ig: word => word.help ? [lengthenStep(word, 'Mach das Wort länger. Was passt?')] : [],
  lich: () => [{ id: 'baustein', question: 'Welcher Baustein steht am Ende?', options: shuffle(['-lich', '-ig', '-isch']).map(value => ({ value, label: value })), answer: '-lich', why: '-lich ist ein eigener Baustein – immer mit ch.' }],
  isch: () => [{ id: 'baustein', question: 'Welcher Baustein steht am Ende?', options: shuffle(['-lich', '-ig', '-isch']).map(value => ({ value, label: value })), answer: '-isch', why: '-isch ist ein Baustein – mit sch.' }],
  ableiten: word => !word.help ? [] : [relativeStep(word, word.help), { id: 'aau', question: 'Hat das verwandte Wort ein a oder au?', ...yn(true), why: `Ja – ${word.help}. Darum ä oder äu.` }],
  ableitenNein: word => [{ id: 'aau', question: `Findest du ein verwandtes Wort mit a oder au zu ${word.text}?`, ...yn(false), why: 'Nein – dann schreibst du e oder eu.' }],
  v: word => [{ id: 'vorsilbe', question: word.parts?.some(p => /^v(er|or)$/i.test(p)) ? 'Beginnt ein Baustein mit ver- oder vor-?' : `Ist ${word.text} ein V-Merkwort wie Vogel, Vater, viel?`, ...yn(true), why: 'Ja – dann mit V.' }],
  vw: word => [{ id: 'klang', question: `Klingt das V in ${word.text} wie ein w?`, ...yn(true), why: 'Ja – in Wörtern aus anderen Sprachen klingt V oft wie w. Merkwort!', speak: true }],
  ent: word => { const end = !!word.parts?.some(p => /^end$/i.test(p)); return [{ id: 'ende', question: `Hat ${word.text} mit dem Ende zu tun?`, ...yn(!!end), why: end ? 'Ja – dann end mit d.' : 'Nein – ent- ist eine Vorsilbe, mit t.' }]; },
  naht: word => !word.parts ? [] : [{ id: 'zerlegen', question: 'Aus welchen Bausteinen besteht das Wort?', options: shuffle([word.parts.join(' + '), wrongSplit(word)]).map(value => ({ value, label: value })), answer: word.parts.join(' + '), why: `${word.parts.join(' + ')}: Jeder Baustein behält seine Buchstaben.` }],
  dass: word => [{ id: 'probe', question: 'Kannst du „dieses“ oder „welches“ einsetzen?', ...yn(word.text === 'das'), why: word.text === 'das' ? 'Ja – das passt. Also das.' : 'Nein – das klingt falsch. Also dass.', speakText: probeSentence(word) }],
  seitseid: word => [{ id: 'probe', question: 'Geht es um Zeit (seit wann)?', ...yn(word.text === 'seit'), why: word.text === 'seit' ? 'Ja – seit mit t.' : 'Nein – es gehört zu ihr: seid mit d.' }],
  nomen: word => [nounStep(word, true)],
  nominal: word => [nounStep(word, true)],
  klein: word => [nounStep(word, false)],
  xlaut: () => [{ id: 'merk', question: 'Kann man den x-Laut hören und herleiten?', ...yn(false), why: 'Nein – x, chs, ks, cks und gs klingen gleich. Merkwort!' }],
  tion: () => [{ id: 'merk', question: 'Wie schreibt man die Endung „zion“?', options: [{ value: 'tion', label: '-tion' }, { value: 'zion', label: '-zion' }], answer: 'tion', why: 'Fast immer -tion. Fremdwort-Endung!' }],
  vokal: word => [{ id: 'silben', question: `Schwing das Wort mit: Wie viele Silben hat es?`, options: [1, 2, 3, 4, 5].map(k => ({ value: String(k), label: String(k) })), answer: String(word.syllables.length), why: `${word.syllables.join(' – ')}: ${word.syllables.length} Silben, in jeder ein Selbstlaut.`, speak: true }],
};
function nounStep(word, noun) {
  const suffix = word.parts?.find(p => /^(ung|heit|keit|nis|schaft)$/i.test(p));
  if (suffix) return { id: 'probe', question: `Endet das Wort auf -ung, -heit, -keit, -nis oder -schaft?`, ...yn(true), why: `Ja: -${suffix}. Damit ist es ein Nomen – groß!` };
  return { id: 'probe', question: word.article ? `Kannst du ${word.article} davorsetzen?` : 'Steht ein Begleiter davor (der, die, das, beim, zum, am, etwas, viel, nichts, alles)?', ...yn(noun), why: noun ? 'Ja – dann ist es hier ein Nomen. Groß!' : 'Nein – kein Begleiter, kein Nomen. Klein!' };
}
// The sentence with dieses/welches in place of das/dass, read aloud for the Ersatzprobe.
function probeSentence(word) {
  const sentence = word.sentence, before = sentence.slice(0, sentence.indexOf('{')).trim();
  const relative = /,$/.test(before) && word.text === 'das';
  return sentence.replace(/\{[^}]+\}/, relative ? 'welches' : 'dieses');
}
function decoy(word) {
  const pool = builtinWords.filter(w => w.text !== word.text && w.text.length >= 4 && w.text[0].toLowerCase() === word.text[0].toLowerCase() && !word.family?.includes(w.text) && w.text !== word.help);
  return (pool[Math.floor(Math.random() * pool.length)] || builtinWords.find(w => w.text !== word.text)).text;
}
// The lengthened form is read aloud: Wald → Wälder, lustig → lustiger. Then the sound at the Knackstelle is clear.
function lengthenStep(word, question) {
  return { id: 'verlaengern', question, options: shuffle([word.help, decoy(word)]).map(value => ({ value, label: value })), answer: word.help, why: `${word.help} – hör genau hin, jetzt ist es klar.`, speakText: word.help };
}
function relativeStep(word, answer = word.family?.[0]) {
  return { id: 'verwandt', question: `Welches Wort ist mit ${word.text} verwandt?`, options: shuffle([answer, decoy(word)]).map(value => ({ value, label: value })), answer, why: `${answer} gehört zur Familie. Die Familie behält ihre Buchstaben.` };
}
function wrongSplit(word) {
  const text = word.text, cut = Math.max(1, word.parts[0].length - 1);
  return text.slice(0, cut) + ' + ' + text.slice(cut);
}

/** The Regelweg for one word: decision steps, then the Knackstelle as a gap. With `strategy` the first step
 * asks which strategy helps – in Kreuz und quer rounds the rules change from word to word. */
export function ruleTask(word, focus = '', { strategy = false, random = Math.random, key: wanted = '' } = {}) {
  const ranked = rankedKnacks(word, focus), key = (wanted && ranked.find(k => k.key === wanted)?.key) || ranked[0]?.key || '';
  const gap = gapFor(word, focus, random, key);
  const steps = (flows[key]?.(word) || []).filter(Boolean);
  if (strategy && phenomena[key]) {
    const right = phenomena[key].strategy, options = shuffle([right, ...shuffle(Object.keys(strategies).filter(s => s !== right), random).slice(0, 2)], random);
    steps.unshift({ id: 'strategie', question: 'Welcher Trick hilft hier?', options: options.map(value => ({ value, label: value })), answer: right, why: `${right}: ${strategies[right]}` });
  }
  return { key, gap, steps };
}

/* ---------- Wortbaustelle: Bausteine zerlegen, bauen, Wortfamilien (MORPHEUS) ---------- */

const affixes = ['ver', 'vor', 'ent', 'be', 'ge', 'er', 'un', 'zer', 'ab', 'ung', 'heit', 'keit', 'lich', 'ig', 'isch', 'nis', 'schaft', 'er', 'en', 't', 'e'];
const syllableBank = ['ma', 'te', 'ro', 'lin', 'ka', 'mo', 'sel', 'pu', 'ne', 'ri', 'do', 'fa'];
/** One Baustelle task per word. Bausteine words alternate between cutting and building; words with a
 * family look for the stem; one-piece words are built from syllables. */
export function morphTask(word, index = 0, random = Math.random) {
  const parts = word.parts?.length > 1 ? word.parts : null;
  if (parts && word.family?.length && index % 3 === 2) {
    const stem = [...parts].sort((a, b) => Number(affixes.includes(a.toLowerCase())) - Number(affixes.includes(b.toLowerCase())) || b.length - a.length)[0];
    const wrong = [word.text.slice(0, 3), word.text.slice(-3)].filter(x => x.toLowerCase() !== stem.toLowerCase());
    return { type: 'stamm', stem, family: word.family.slice(0, 2), options: shuffle([...new Set([stem, ...wrong])], random).slice(0, 3), answer: stem };
  }
  if (parts && index % 2 === 0) return { type: 'zerlegen', letters: [...word.text], answer: partCuts(parts) };
  if (parts) {
    const extra = shuffle(affixes.filter(a => !parts.some(p => p.toLowerCase() === a)), random)[0];
    return { type: 'bauen', pieces: parts, tiles: shuffle([...parts.map((value, i) => ({ id: 'p' + i, value })), { id: 'x', value: extra }], random), answer: word.text };
  }
  if (word.family?.length) return { type: 'familie', options: shuffle([word.family[0], decoy(word)], random), answer: word.family[0] };
  const pieces = word.syllables.length > 1 ? word.syllables : [...word.text];
  const extra = shuffle(syllableBank.filter(s => !pieces.some(p => p.toLowerCase() === s)), random)[0];
  return { type: 'bauen', silben: true, pieces, tiles: shuffle([...pieces.map((value, i) => ({ id: 'p' + i, value })), { id: 'x', value: extra }], random), answer: word.text };
}
export const partCuts = parts => parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('').length);
export const cutsToText = (letters, cuts) => letters.map((l, i) => (cuts.includes(i) ? '|' : '') + l).join('');
