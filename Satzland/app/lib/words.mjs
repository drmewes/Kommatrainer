import gws from '../data/gws-nrw.json' with { type: 'json' };
import { etappen } from '../data/etappen.mjs';

// Spelling phenomena ("Knackstellen") follow the strategy model children know from primary school (FRESCH, NRW):
// Silben schwingen, Verlängern, Ableiten, Zerlegen, Merken, plus the Proben for Groß-/Kleinschreibung and das/dass.
// Hören, Betonung and Lang/kurz are the listening skills underneath the vowel-length rules.
export const phenomena = {
  silben: { label: 'Silben hören', strategy: 'Silben schwingen' },
  betonung: { label: 'Betonte Silbe hören', strategy: 'Silben schwingen' },
  laenge: { label: 'Lang oder kurz hören', strategy: 'Silben schwingen' },
  paar: { label: 'Ähnliche Wörter unterscheiden', strategy: 'Silben schwingen' },
  baustein: { label: 'Wortbausteine', strategy: 'Zerlegen' },
  vokal: { label: 'Selbstlaut in jeder Silbe', strategy: 'Silben schwingen' },
  einfach: { label: 'Nach langem Selbstlaut nur ein Mitlaut', strategy: 'Silben schwingen' },
  doppel: { label: 'Doppelte Mitlaute', strategy: 'Silben schwingen' },
  ck: { label: 'ck statt kk', strategy: 'Silben schwingen' },
  tz: { label: 'tz statt zz', strategy: 'Silben schwingen' },
  nachmitlaut: { label: 'Nach l, n, r kein ck und kein tz', strategy: 'Silben schwingen' },
  stamm: { label: 'Doppelt bleibt doppelt (Wortstamm)', strategy: 'Verlängern' },
  ie: { label: 'Langes i: ie', strategy: 'Silben schwingen' },
  imerk: { label: 'Langes i ohne e (Merkwort)', strategy: 'Merken' },
  ikurz: { label: 'Kurzes i', strategy: 'Silben schwingen' },
  ih: { label: 'ih in ihm, ihn, ihr', strategy: 'Merken' },
  wieder: { label: 'wieder oder wider', strategy: 'Probe' },
  dehnung: { label: 'Dehnungs-h', strategy: 'Merken' },
  ohneh: { label: 'Langer Selbstlaut ohne h', strategy: 'Merken' },
  silbenh: { label: 'h zwischen zwei Silben', strategy: 'Verlängern' },
  doppelvokal: { label: 'aa, ee, oo', strategy: 'Merken' },
  sz: { label: 'ß nach langem Selbstlaut', strategy: 'Silben schwingen' },
  ss: { label: 'ss nach kurzem Selbstlaut', strategy: 'Silben schwingen' },
  dass: { label: 'das oder dass', strategy: 'Probe' },
  seitseid: { label: 'seit oder seid', strategy: 'Probe' },
  auslaut: { label: 'd/t, g/k, b/p am Ende', strategy: 'Verlängern' },
  ig: { label: '-ig am Ende', strategy: 'Verlängern' },
  lich: { label: 'Baustein -lich', strategy: 'Zerlegen' },
  isch: { label: 'Baustein -isch', strategy: 'Zerlegen' },
  ableiten: { label: 'ä und äu', strategy: 'Ableiten' },
  ableitenNein: { label: 'e und eu ohne verwandtes a/au', strategy: 'Ableiten' },
  v: { label: 'V statt F', strategy: 'Merken' },
  vw: { label: 'V wie w', strategy: 'Merken' },
  ent: { label: 'ent- oder end-', strategy: 'Zerlegen' },
  naht: { label: 'Gleiche Buchstaben an der Naht', strategy: 'Zerlegen' },
  xlaut: { label: 'x, chs, ks, cks, gs', strategy: 'Merken' },
  tion: { label: 'Fremdwort-Endung -tion', strategy: 'Merken' },
  th: { label: 'th in Fremdwörtern', strategy: 'Merken' },
  ph: { label: 'ph in Fremdwörtern', strategy: 'Merken' },
  y: { label: 'y in Fremdwörtern', strategy: 'Merken' },
  nomen: { label: 'Nomen groß schreiben', strategy: 'Probe' },
  nominal: { label: 'Verben und Wie-Wörter als Nomen', strategy: 'Probe' },
  klein: { label: 'Kein Nomen: klein', strategy: 'Probe' },
  sp: { label: 'sp am Anfang', strategy: 'Merken' },
  st: { label: 'st am Anfang', strategy: 'Merken' },
  sch: { label: 'sch', strategy: 'Merken' },
  ch: { label: 'ch', strategy: 'Merken' },
  ng: { label: 'ng', strategy: 'Silben schwingen' },
  pf: { label: 'pf', strategy: 'Silben schwingen' },
  ei: { label: 'ei', strategy: 'Merken' },
  eu: { label: 'eu', strategy: 'Merken' },
  au: { label: 'au', strategy: 'Merken' },
  er: { label: '-er am Ende (klingt wie a)', strategy: 'Merken' },
  el: { label: 'Endung -el', strategy: 'Silben schwingen' },
  en: { label: 'Endung -en', strategy: 'Silben schwingen' },
  e: { label: 'leises e am Ende', strategy: 'Silben schwingen' },
};
export const strategies = {
  'Silben schwingen': 'Sprich das Wort in Silben und hör auf den betonten Selbstlaut: lang oder kurz?',
  Verlängern: 'Mach das Wort länger – dann hörst du, was am Ende oder im Stamm steht: Hund → Hunde, kommt → kommen.',
  Ableiten: 'Such ein verwandtes Wort mit a oder au: Bäume → Baum. Gibt es keins, schreibst du e oder eu.',
  Zerlegen: 'Zerleg das Wort in seine Bausteine: Vorsilbe, Wortstamm, Endung. Jeder Baustein behält seine Buchstaben.',
  Merken: 'Das kann man nicht hören und nicht herleiten. Merkwörter übt man mit Anschauen, Abdecken, Schreiben, Vergleichen.',
  Probe: 'Mach die Probe: Artikelprobe für Nomen, Ersatzprobe für das und dass, Bedeutung prüfen für wieder und wider.',
};

// Etappe focus → phenomena that are practised first for its words.
const focusKeys = {
  silben: ['vokal'], laenge: ['doppel', 'ck', 'tz', 'einfach'], doppel: ['doppel', 'einfach'], cktz: ['ck', 'tz', 'nachmitlaut'],
  nomen: ['nomen'], stamm: ['stamm', 'naht', 'doppel'], ie: ['ie', 'imerk'], ih: ['ih', 'wieder'], dehnung: ['dehnung', 'ohneh'],
  doppelvokal: ['doppelvokal', 'ableiten'], silbenh: ['silbenh'], sz: ['sz'], ss: ['ss', 'sz'], dass: ['dass'], auslaut: ['auslaut'],
  ig: ['ig', 'lich', 'isch'], ableiten: ['ableiten', 'ableitenNein'], v: ['v', 'vw'], ent: ['ent'], naht: ['naht'], nominal: ['nominal', 'klein'],
  xlaut: ['xlaut'], fremd: ['tion', 'th', 'ph', 'y'], zeit: ['nomen', 'klein'], gross: ['nominal', 'klein'], fehler: ['dass', 'seitseid', 'imerk'],
  familie: ['dehnung', 'ableiten', 'auslaut', 'ie', 'stamm'],
};
// Without a focus (Kreuz und quer, own words) the most telling Knackstelle wins.
const priority = ['dass', 'seitseid', 'wieder', 'ih', 'imerk', 'ohneh', 'ableitenNein', 'vw', 'nominal', 'klein', 'naht', 'stamm', 'ent', 'ie', 'doppel', 'ss', 'ck', 'tz', 'nachmitlaut', 'sz', 'xlaut', 'auslaut', 'ig', 'lich', 'isch', 'ableiten', 'dehnung', 'silbenh', 'doppelvokal', 'v', 'tion', 'th', 'ph', 'y', 'nomen', 'einfach', 'ei', 'eu', 'au', 'pf', 'ng', 'er', 'el', 'en', 'e', 'ikurz', 'sp', 'st', 'sch', 'ch', 'vokal'];
const caseKeys = new Set(['nomen', 'nominal', 'klein']);

/** @type {{ w: string; tags: string[] }[]} */
export const gwsWords = gws;
export const officialSet = new Set(gws.map(entry => entry.w));

export const clean = value => String(value ?? '').normalize('NFC').replace(/[‘’´`]/g, "'").replace(/\s+/g, ' ').trim();

const vowelGroup = ['äu', 'au', 'eu', 'ei', 'ai', 'ie', 'aa', 'ee', 'oo'];
const diphthongs = ['äu', 'au', 'eu', 'ei', 'ai'];
const isVowel = ch => !!ch && 'aeiouäöüy'.includes(ch);
// Syllables for words without curated ones (parents' words); the curated list overrides this.
export function syllabify(text) {
  const word = clean(text), lower = word.toLowerCase(), nuclei = [];
  for (let i = 0; i < lower.length;) {
    if (!isVowel(lower[i]) || lower[i] === 'u' && lower[i - 1] === 'q') { i++; continue; }
    const end = vowelGroup.includes(lower.slice(i, i + 2)) ? i + 2 : i + 1;
    nuclei.push([i, end]); i = end;
  }
  if (nuclei.length < 2 || /[\s-]/.test(word)) return [word];
  const cuts = [];
  for (let k = 0; k < nuclei.length - 1; k++) {
    const a = nuclei[k][1], b = nuclei[k + 1][0], cons = lower.slice(a, b);
    if (cons.length <= 1 || ['ch', 'ck', 'sch', 'ph', 'th'].includes(cons)) cuts.push(a);
    else if (/(sch|ch|ck|ph|th)$/.test(cons) && !/chs$/.test(cons)) cuts.push(b - (cons.endsWith('sch') ? 3 : 2));
    else cuts.push(b - 1);
  }
  const bounds = [0, ...cuts, word.length];
  return bounds.slice(1).map((end, i) => word.slice(bounds[i], end)).filter(Boolean);
}

// Morphemes for parents' words: common prefixes and suffixes are split off a stem of at least three letters.
const prefixes = ['ver', 'vor', 'ent', 'zer', 'be', 'ge', 'er', 'un', 'ab', 'an', 'auf', 'aus', 'mit', 'nach', 'über', 'unter', 'zu'];
const suffixes = ['ungen', 'ung', 'heit', 'keit', 'schaft', 'nis', 'lich', 'isch', 'ig', 'bar', 'sam', 'chen', 'lein', 'er', 'en', 'el', 'st', 't', 'e', 'n'];
export function splitParts(text) {
  const word = clean(text), lower = word.toLowerCase();
  if (word.length < 6 || /\s/.test(word)) return [word];
  let start = 0, end = word.length;
  const head = prefixes.find(p => lower.startsWith(p) && lower.length - p.length >= 4 && /[aeiouäöüy]/.test(lower.slice(p.length, p.length + 4)));
  if (head) start = head.length;
  const tail = suffixes.find(s => lower.endsWith(s) && end - s.length - start >= 3 && /[aeiouäöüy]/.test(lower.slice(start, end - s.length)));
  if (tail && tail.length >= 2) end -= tail.length;
  return [word.slice(0, start), word.slice(start, end), word.slice(end)].filter(Boolean);
}

const unstressed = ['be', 'ge', 'er', 'ver', 'zer', 'ent', 'emp'];
/** The stressed syllable: curated, or the first syllable after unstressed prefixes (Ge-wit-ter), or -ieren. */
export function stressIndex(word) {
  if (Number.isInteger(word.stress)) return word.stress;
  const syl = word.syllables, n = syl.length;
  if (n < 2) return 0;
  if (n >= 3 && /ie/i.test(syl[n - 2]) && /^ren$/i.test(syl[n - 1])) return n - 2;
  let i = 0;
  for (const part of (word.parts || []).slice(0, -1)) {
    if (unstressed.includes(part.toLowerCase()) && syl[i]?.toLowerCase() === part.toLowerCase()) i++; else break;
  }
  return Math.min(i, n - 1);
}

// Where the stressed vowel sits and whether it is long, short or a diphthong. This drives the Hörlabor and the
// vowel-length rules; curated words override the guess where German is irregular (Pferd, Montag, nämlich).
export function vowelInfo(word) {
  const syl = word.syllables, index = stressIndex(word), start = syl.slice(0, index).join('').length;
  const syllable = syl[index] || word.text, lower = word.text.toLowerCase(), s = syllable.toLowerCase();
  let at = 0, len = 1;
  if (/tion$/.test(s)) { at = s.length - 2; len = 1; }
  else for (let i = 0; i < s.length; i++) {
    if (!isVowel(s[i]) || s[i] === 'u' && s[i - 1] === 'q') continue;
    at = i; len = vowelGroup.includes(s.slice(i, i + 2)) ? 2 : 1; break;
  }
  const from = start + at, to = from + len, nucleus = lower.slice(from, to);
  let length = word.length;
  if (!length) {
    const after = lower.slice(to).replace(/^(ph|th)/, 'f'), cons = (after.match(/^[^aeiouäöüy]*/) || [''])[0];
    if (diphthongs.includes(nucleus)) length = 'zwie';
    else if (len === 2 || after[0] === 'h' || after[0] === 'ß' || /tion$/.test(s)) length = 'lang';
    else if (/^(bb|dd|ff|gg|ll|mm|nn|pp|rr|ss|tt|ck|tz|zz|sch|ch|ng|nk|x|pf)/.test(after)) length = 'kurz';
    else if (!cons.length) length = 'lang';
    else if (cons.length >= 2) length = 'kurz';
    else if (after.length > 1) length = 'lang';
    // A single consonant at the very end: the lengthened form tells (Zug → Züge), short function words are Merkwörter.
    else if (word.help && !word.helpOf) length = vowelInfo({ text: word.help, syllables: syllabify(word.help), helpOf: true }).length;
    else length = word.merk && syl.length === 1 ? 'kurz' : 'lang';
  }
  return { index, syllable, from, to, nucleus, length };
}

/** "Him-mel|der|🌌|Am {Himmel} …|Hilfe|Bau+steine|Familie|Optionen" → word. A leading * marks Merkwörter, + Profi words. */
const sliceParts = (text, parts) => { if (parts.join('').toLowerCase() !== text.toLowerCase()) return parts; let at = 0; return parts.map(p => text.slice(at, at += p.length)); };
export function parseWord(line, n = 1) {
  const flags = line.match(/^[*+]*/)[0];
  const [syllableText, article, emoji, sentence, help, partText, familyText, optionText] = line.slice(flags.length).split('|').map(part => (part || '').trim());
  const marked = syllableText.split('-'), stress = marked.findIndex(s => s.startsWith("'"));
  const syllables = marked.map(s => s.replace(/^'/, '')), text = syllables.join('');
  const options = Object.fromEntries((optionText || '').split(/\s+/).filter(Boolean).map(o => o.includes('=') ? o.split('=') : [o, true]));
  const length = ['lang', 'kurz', 'zwie'].find(key => options[key]);
  return { id: 'lrs:' + text + (n > 1 ? '#' + n : ''), text, syllables, ...(article ? { article } : {}), ...(emoji ? { emoji } : {}), sentence,
    ...(help ? { help } : {}), ...(partText ? { parts: sliceParts(text, partText.split('+')) } : {}), ...(familyText ? { family: familyText.split(',').map(f => f.trim()).filter(Boolean) } : {}),
    ...(stress >= 0 ? { stress } : {}), ...(length ? { length } : {}), ...(options.k ? { knack: options.k } : {}), ...(options.p ? { pair: options.p } : {}),
    ...(flags.includes('*') ? { merk: true } : {}), ...(flags.includes('+') ? { profi: true } : {}) };
}

// Words with the same spelling in one Etappe (das, dass) get their own id per sentence.
function etappeWords(lines) {
  const seen = new Map();
  return lines.map(line => { const w = parseWord(line); const n = (seen.get(w.text) || 0) + 1; seen.set(w.text, n); return n > 1 ? parseWord(line, n) : w; });
}
export const packages = etappen.map(p => ({ id: 'etappe-' + p.week, name: 'Etappe ' + p.week, description: p.title, week: p.week, from: p.from, to: p.to, focus: p.focus, ...(p.skip ? { skip: p.skip } : {}), words: etappeWords(p.words) }));
export const builtinWords = packages.flatMap(p => p.words);

// Parents may add their own words; syllables, stress, length and Bausteine are derived and can be corrected.
export function customWord({ text, article = '', sentence = '', emoji = '', help = '', parts = '', family = '', syllables = '', length = '', profi = false, id = '' }) {
  const word = clean(text), satz = clean(sentence);
  const syl = clean(syllables).replace(/\s/g, ''), split = syl && syl.replace(/[-·']/g, '') === word ? syl.split(/[-·]/) : syllabify(word);
  const stress = split.findIndex(s => s.startsWith("'"));
  const partList = clean(parts) ? sliceParts(word, clean(parts).split(/\s*\+\s*/).filter(Boolean)) : splitParts(word);
  return { id: id || 'eigen:' + word, text: word, syllables: split.map(s => s.replace(/^'/, '')), ...(stress >= 0 ? { stress } : {}),
    ...(article ? { article } : {}), ...(emoji ? { emoji } : {}),
    sentence: satz.includes('{') ? satz : satz.includes(word) ? satz.replace(word, '{' + word + '}') : '',
    ...(clean(help) ? { help: clean(help) } : {}), ...(partList.length > 1 && partList.join('') === word ? { parts: partList } : {}),
    ...(clean(family) ? { family: clean(family).split(/\s*,\s*/).filter(Boolean) } : {}), ...(['lang', 'kurz', 'zwie'].includes(length) ? { length } : {}),
    ...(profi ? { profi: true } : {}), custom: true };
}

const caseLike = (sample, value) => sample && sample[0] === sample[0].toUpperCase() && sample[0] !== sample[0].toLowerCase() ? value[0].toUpperCase() + value.slice(1) : value;
const vowelAlternatives = { a: ['e', 'o'], e: ['i', 'a'], i: ['e'], o: ['u', 'a'], u: ['o', 'ü'], ä: ['e'], ö: ['ü', 'o'], ü: ['i', 'u'], y: ['ü'] };
const doubled = { k: 'ck', z: 'tz' };
export function partBounds(word) {
  const bounds = []; let at = 0;
  for (const part of (word.parts || []).slice(0, -1)) { at += part.length; bounds.push(at); }
  return bounds;
}

/** Every Knackstelle of a word: where it is and which spellings children typically try instead. */
export function knacks(word) {
  const text = word.text, lower = text.toLowerCase(), found = [];
  const add = (key, start, end, alts, keepCase = false) => { if (!found.some(k => k.key === key && k.start === start)) found.push({ key, start, end, alts: keepCase ? alts : alts.map(alt => caseLike(text.slice(start, end), alt)) }); };
  const syllables = word.syllables?.length ? word.syllables : syllabify(text), bounds = partBounds(word), vowel = vowelInfo({ ...word, syllables });
  const starts = []; let offset = 0;
  for (const s of syllables) { starts.push(offset); offset += s.length; }
  const sameSyllable = (i, j) => starts.filter(s => s <= i).length === starts.filter(s => s <= j).length;
  const multi = syllables.length > 1;
  // Curated Knackstellen that the letters alone do not reveal.
  if (word.knack === 'dass' && /^dass?$/.test(lower)) add('dass', 2, lower.length, [lower === 'das' ? 'ss' : 's']);
  if (word.knack === 'seitseid' && /^sei[td]$/.test(lower)) add('seitseid', 3, 4, [lower[3] === 't' ? 'd' : 't']);
  if (word.knack === 'imerk') add('imerk', vowel.from, vowel.to, ['ie']);
  if (word.knack === 'ohneh') add('ohneh', vowel.from, vowel.to, [vowel.nucleus + 'h']);
  if (word.knack === 'ableitenNein') { const eu = lower.indexOf('eu'); if (eu >= 0) add('ableitenNein', eu, eu + 2, ['äu']); else add('ableitenNein', vowel.from, vowel.to, ['ä']); }
  if (word.knack === 'vw' && lower.includes('v')) add('vw', lower.indexOf('v'), lower.indexOf('v') + 1, ['w']);
  if (word.knack === 'nominal' || word.knack === 'nomen' && !word.article) add(word.knack, 0, 1, [lower[0]], true);
  if (word.knack === 'klein') add('klein', 0, 1, [text[0].toUpperCase()], true);
  if (word.knack === 'nachmitlaut') { const m = lower.match(/[lnr](k|z)/); if (m) add('nachmitlaut', m.index + 1, m.index + 2, [doubled[m[1]]]); }
  if (/^ih/.test(lower)) add('ih', 0, 2, ['i', 'ie']);
  if (/^wieder/.test(lower)) add('wieder', 1, 3, ['i']);
  else if (/^wider/.test(lower)) add('wieder', 1, 2, ['ie']);
  for (const s of starts) {
    if (lower.startsWith('sp', s)) add('sp', s, s + 2, ['schp']);
    if (lower.startsWith('st', s)) add('st', s, s + 2, ['scht']);
  }
  // Same letters meet at the seam of two Bausteine: Fahr|rad, Schiff|fahrt, Mit|tag.
  for (const b of bounds) {
    if (lower[b - 1] !== lower[b] || isVowel(lower[b]) && lower[b] !== 'e') continue;
    let from = b - 1, to = b + 1;
    while (from > 0 && lower[from - 1] === lower[b]) from--;
    while (lower[to] === lower[b]) to++;
    add('naht', from, to, [text.slice(from, to - 1)], true);
  }
  for (const part of word.parts || []) {
    const at = bounds.length ? [0, ...bounds][word.parts.indexOf(part)] : 0, p = part.toLowerCase();
    if (p === 'ent' || p === 'end') add('ent', at + 2, at + 3, [p === 'ent' ? 'd' : 't']);
  }
  if (!word.parts?.length && /^ent/.test(lower) && lower.length > 5) add('ent', 2, 3, ['d']);
  for (const m of lower.matchAll(/ie/g)) if (sameSyllable(m.index, m.index + 1)) add('ie', m.index, m.index + 2, ['i', 'ih']);
  for (const m of lower.matchAll(/(bb|dd|ff|gg|ll|mm|nn|pp|rr|tt)/g)) {
    if (bounds.includes(m.index + 1)) continue;
    // Before another consonant the doubling is not heard any more; the Wortstamm keeps it (kommt ← kommen).
    const next = lower[m.index + 2];
    add(next && !isVowel(next) && next !== m[0][0] ? 'stamm' : 'doppel', m.index, m.index + 2, [m[0][0]]);
  }
  for (const m of lower.matchAll(/ss/g)) if (!bounds.includes(m.index + 1)) add('ss', m.index, m.index + 2, ['ß', 's']);
  for (const m of lower.matchAll(/ck/g)) add('ck', m.index, m.index + 2, ['k']);
  for (const m of lower.matchAll(/tz/g)) add('tz', m.index, m.index + 2, ['z']);
  for (const m of lower.matchAll(/(?<=[aeiouäöü])[lnr](k|z)/g)) if (!bounds.includes(m.index + 1) && !/ck|tz/.test(lower.slice(m.index + 1, m.index + 3))) add('nachmitlaut', m.index + 1, m.index + 2, [doubled[m[1]]]);
  for (const m of lower.matchAll(/ß/g)) add('sz', m.index, m.index + 1, ['ss', 's']);
  for (const m of lower.matchAll(/chs|cks|(?<!n)gs|ks|x/g)) {
    const alts = ['chs', 'x', 'ks', 'cks'].filter(alt => alt !== m[0]).slice(0, 2);
    add('xlaut', m.index, m.index + m[0].length, alts);
  }
  const ig = /ig$/.test(lower) && multi;
  if (ig) add('ig', lower.length - 1, lower.length, ['ch']);
  if (/lich$/.test(lower) && multi) add('lich', lower.length - 4, lower.length, ['lig']);
  if (/isch$/.test(lower) && multi) add('isch', lower.length - 4, lower.length, ['ich']);
  const final = lower.match(/(?:(?<!n)g|d|b)(?=(?:s|t|st)?$)/);
  if (final && !(ig && final.index === lower.length - 1)) add('auslaut', final.index, final.index + 1, [{ d: 't', g: 'k', b: 'p' }[final[0]]]);
  for (const b of bounds) {
    const m = lower.slice(0, b).match(/(?:(?<!n)g|d|b)$/);
    if (m && b - 1 !== final?.index && !isVowel(lower[b])) add('auslaut', b - 1, b, [{ d: 't', g: 'k', b: 'p' }[m[0]]]);
  }
  const umlaut = lower.indexOf('äu');
  if (umlaut >= 0) add('ableiten', umlaut, umlaut + 2, ['eu']);
  else for (const m of lower.matchAll(/ä/g)) add('ableiten', m.index, m.index + 1, ['e']);
  for (const m of lower.matchAll(/([aeiouäöü])h/g)) {
    const h = m.index + 1, next = lower[h + 1] || '', afterDiphthong = /(ei|au|eu|äu|ie)$/.test(lower.slice(0, h));
    const v = m[1], stretched = { a: ['a', 'aa'], e: ['e', 'ee'], o: ['o', 'oo'], i: ['i', 'ie'], u: ['u'], ä: ['ä', 'e'], ö: ['ö'], ü: ['ü'] }[v];
    if (/^ih/.test(lower) && m.index === 0) continue;
    if (afterDiphthong) add('silbenh', h - 2, h + 1, [lower.slice(h - 2, h)]);
    else if (isVowel(next) || !next || bounds.includes(h + 1)) add('silbenh', m.index, h + 1, [v]);
    else if ('lmnr'.includes(next)) add('dehnung', m.index, h + 1, stretched);
  }
  for (const m of lower.matchAll(/(aa|ee|oo)/g)) if (sameSyllable(m.index, m.index + 1)) add('doppelvokal', m.index, m.index + 2, [m[0][0], m[0][0] + 'h']);
  const vAt = lower.startsWith('v') ? 0 : bounds.find(b => lower.startsWith('ver', b) || lower.startsWith('vor', b));
  if (vAt !== undefined && word.knack !== 'vw') add('v', vAt, vAt + 1, ['f']);
  for (const m of lower.matchAll(/tion/g)) add('tion', m.index, m.index + 1, ['z']);
  for (const m of lower.matchAll(/th/g)) add('th', m.index, m.index + 2, ['t']);
  for (const m of lower.matchAll(/ph/g)) add('ph', m.index, m.index + 2, ['f']);
  for (const m of lower.matchAll(/y/g)) add('y', m.index, m.index + 1, [m.index === lower.length - 1 ? 'i' : 'ü']);
  // Long vowel, then a single consonant: the counterpart of the doubling rule (Ofen, Hüte, Kamel).
  if (vowel.length === 'lang' && vowel.nucleus.length === 1) {
    const c = lower[vowel.to], after = lower[vowel.to + 1];
    if (c && !isVowel(c) && c !== 'h' && c !== 'ß' && c !== after && (!after || isVowel(after)) && 'bdfglmnprtkzs'.includes(c)) add('einfach', vowel.to, vowel.to + 1, [doubled[c] || c + c]);
  }
  for (const m of lower.matchAll(/pf/g)) add('pf', m.index, m.index + 2, ['f']);
  for (const m of lower.matchAll(/ng/g)) add('ng', m.index, m.index + 2, ['nk']);
  for (const m of lower.matchAll(/sch/g)) add('sch', m.index, m.index + 3, ['sh']);
  for (const m of lower.matchAll(/(?<!s)ch(?!s)/g)) add('ch', m.index, m.index + 2, ['sch']);
  for (const m of lower.matchAll(/ei/g)) add('ei', m.index, m.index + 2, ['ai']);
  for (const m of lower.matchAll(/eu/g)) if (word.knack !== 'ableitenNein') add('eu', m.index, m.index + 2, ['oi']);
  for (const m of lower.matchAll(/(?<!ä)au/g)) add('au', m.index, m.index + 2, ['ao']);
  if (multi) {
    const er = lower.match(/er(?=n?$)/);
    if (er) add('er', er.index, er.index + 2, ['a']);
    if (/el$/.test(lower)) add('el', lower.length - 2, lower.length, ['l']);
    if (/en$/.test(lower)) add('en', lower.length - 2, lower.length, ['n']);
    if (/[^aeiouäöü]e$/.test(lower)) add('e', lower.length - 1, lower.length, ['a']);
  }
  for (const m of lower.matchAll(/(?<![aeiouäöü])i(?![eh])/g)) if (!/[ae]$/.test(lower.slice(0, m.index)) && word.knack !== 'imerk') { add('ikurz', m.index, m.index + 1, ['ie']); break; }
  if (word.article && text[0] !== lower[0]) add('nomen', 0, 1, [lower[0]], true);
  const first = vowel.from;
  if (isVowel(lower[first])) add('vokal', first, first + 1, vowelAlternatives[lower[first]] || ['e']);
  return found;
}

// The Etappe's phenomenon comes first, a curated Knackstelle before everything; otherwise the most telling one.
export function rankedKnacks(word, focus = '') {
  const wanted = word.knack ? [word.knack, ...(focusKeys[focus] || [])] : focusKeys[focus] || [];
  const rank = key => { const f = wanted.indexOf(key); return f >= 0 ? f - 100 : priority.indexOf(key); };
  return knacks(word).sort((a, b) => rank(a.key) - rank(b.key) || a.start - b.start);
}
export const focusKnack = (word, focus = '') => rankedKnacks(word, focus)[0];
export const replaceAt = (text, k, alt) => text.slice(0, k.start) + alt + text.slice(k.end);

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

/** A Lückenwort: the Knackstelle is left out and offered as letter tiles. Only the gap differs between the tiles. */
export function gapFor(word, focus = '', random = Math.random, key = '') {
  const ranked = rankedKnacks(word, focus);
  const k = (key && ranked.find(item => item.key === key)) || ranked[0];
  if (!k) return null;
  const answer = word.text.slice(k.start, k.end);
  const options = [...new Set([answer, ...k.alts.filter(alt => alt !== undefined)])].slice(0, 3);
  return { key: k.key, before: word.text.slice(0, k.start), after: word.text.slice(k.end), answer, options: shuffle(options, random) };
}

export function editDistance(a, b) {
  const x = [...a], y = [...b];
  const d = Array.from({ length: x.length + 1 }, (_, i) => Array.from({ length: y.length + 1 }, (_, j) => i ? j ? 0 : i : j));
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + Number(x[i - 1] !== y[j - 1]));
    if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[x.length][y.length];
}

/**
 * Only the exact word counts as perfect. A pure Groß-/Kleinschreibung slip is "fast richtig", except where
 * capitalisation is the Knackstelle itself (Nomen-Bausteine, das Lesen, abends): there it is a mistake.
 * @returns {{ kind: 'exact' | 'tolerated' | 'incorrect'; accepted: boolean; distance: number; expected: string; caseOnly: boolean; knack: string | null }}
 */
export function evaluateSpelling(input, word, focus = '') {
  const value = clean(input), text = word.text;
  if (value === text) return { kind: 'exact', accepted: true, distance: 0, expected: text, caseOnly: false, knack: null };
  if (value && value.toLowerCase() === text.toLowerCase()) {
    const key = word.knack && caseKeys.has(word.knack) ? word.knack : word.article ? 'nomen' : text[0] === text[0].toUpperCase() ? 'nominal' : 'klein';
    const strict = caseKeys.has(word.knack) || (focusKeys[focus] || []).some(k => caseKeys.has(k));
    return { kind: strict ? 'incorrect' : 'tolerated', accepted: !strict, distance: 0, expected: text, caseOnly: true, knack: key };
  }
  const distance = editDistance(value.toLowerCase(), text.toLowerCase());
  let knack = null;
  for (const k of rankedKnacks(word, focus)) {
    if (k.alts.some(alt => replaceAt(text, k, alt).toLowerCase() === value.toLowerCase())) { knack = k.key; break; }
  }
  return { kind: 'incorrect', accepted: false, distance, expected: text, caseOnly: false, knack };
}

// Alignment for feedback: correct letters, wrong letters and missing letters stay visible.
export function highlightDiff(input, expected) {
  const a = [...clean(input)], b = [...expected];
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i ? j ? 0 : i : j));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
  const result = []; let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) { result.unshift({ value: a[--i], kind: 'same' }); j--; }
    else if (i && j && d[i][j] === d[i - 1][j - 1] + 1) { result.unshift({ value: a[--i], kind: 'wrong' }); j--; }
    else if (i && d[i][j] === d[i - 1][j] + 1) result.unshift({ value: a[--i], kind: 'extra' });
    else result.unshift({ value: b[--j], kind: 'missing' });
  }
  return result;
}

// The general rule for a Knackstelle, used when Schreibi introduces it.
export const rules = {
  silben: 'Jedes Wort lässt sich in Silben schwingen. Klatsch mit: To – ma – te. So viele Silben, so viele Klatscher.',
  betonung: 'In jedem Wort klingt eine Silbe stärker als die anderen: To – MA – te. Auf ihren Selbstlaut kommt es an.',
  laenge: 'Hör auf den betonten Selbstlaut: Ist er lang wie in Ofen oder kurz wie in offen? Davon hängt ab, wie es weitergeht.',
  vokal: 'Jede Silbe hat einen Selbstlaut (a, e, i, o, u, ä, ö, ü) oder einen Zwielaut (au, ei, eu). Schwing das Wort, dann geht keiner verloren.',
  einfach: 'Ist der betonte Selbstlaut lang, folgt meistens nur ein Mitlaut: O – fen, Hü – te, Ka – mel.',
  doppel: 'Nach einem kurzen, betonten Selbstlaut hörst du oft nur einen Mitlaut. Dann wird er verdoppelt: Him – mel. In jede Silbe kommt einer.',
  ck: 'Nach einem kurzen Selbstlaut schreibst du ck statt kk: Zu – cker, Brü – cke.',
  tz: 'Nach einem kurzen Selbstlaut schreibst du tz statt zz: Kat – ze, Pfüt – ze.',
  nachmitlaut: 'Nach l, n und r – das merke dir sehr – steht nie tz und nie ck: Herz, Bank, Pilz.',
  stamm: 'Vor einem anderen Mitlaut hörst du die Verdopplung nicht mehr. Verlängere das Wort: kommt → kommen. Der Wortstamm behält seine Buchstaben.',
  ie: 'Klingt das i lang, schreibst du fast immer ie: Pa – pier, Wie – se. Verben auf -ieren auch: probieren.',
  imerk: 'Ein paar Wörter, oft aus anderen Sprachen, haben ein langes i ohne e: Tiger, Krokodil, Maschine. Merkwörter!',
  ikurz: 'Ist das i kurz, schreibst du nur i: Kind, Bild, still.',
  ih: 'ihm, ihn, ihr, ihnen, ihre: Diese kleinen Wörter schreibt man mit ih. Die ganze Familie hat das h.',
  wieder: 'wieder mit ie heißt „noch einmal“ (wiederholen). wider mit i heißt „gegen“ (widersprechen).',
  dehnung: 'Nach einem langen Selbstlaut steht manchmal ein h – aber nur vor l, m, n oder r: Zahl, Zahn, Uhr. Hören kann man es nicht. Gut: Die ganze Wortfamilie behält das h.',
  ohneh: 'Vor l, m, n, r kann ein Dehnungs-h stehen – muss aber nicht: Schule, Name, Tor. Darum sind Dehnungs-h-Wörter Merkwörter.',
  silbenh: 'Manchmal steht ein h zwischen zwei Silben: ge – hen, Ru – he. Bei geht oder früh verlängerst du: gehen, früher.',
  doppelvokal: 'Nur a, e und o können doppelt stehen: Haar, Meer, Boot. Das sind Merkwörter. Aus aa wird nie ää: Paar → Pärchen.',
  sz: 'Nach einem langen Selbstlaut oder einem Zwielaut schreibst du ß, wenn das s scharf zischt: Straße, Fuß, heiß.',
  ss: 'Nach einem kurzen Selbstlaut schreibst du ss: Fluss, Wasser. In derselben Familie kann es wechseln: fließen – Fluss.',
  dass: 'Kannst du „dieses“ oder „welches“ einsetzen, schreibst du das. Geht das nicht, schreibst du dass.',
  seitseid: 'seit mit t hat mit Zeit zu tun: seit einer Stunde. seid mit d gehört zu ihr: Ihr seid toll.',
  auslaut: 'Am Ende klingen d und t, g und k, b und p gleich. Verlängere das Wort, dann hörst du es: Wald → Wälder.',
  ig: 'Am Ende hörst du ich, aber oft schreibst du -ig. Verlängere: lustig → lustiger. Jetzt hörst du das g.',
  lich: '-lich ist ein Baustein und wird immer mit ch geschrieben: freundlich, glücklich. Verlängere: freundlicher.',
  ableiten: 'Gibt es ein verwandtes Wort mit a oder au? Dann schreibst du ä oder äu: Bäume → Baum, Hände → Hand.',
  ableitenNein: 'Findest du kein verwandtes Wort mit a oder au, schreibst du e oder eu: Hecke, Eule, Leute.',
  v: 'Am Anfang hörst du f, aber manche Wörter schreibt man mit V: Vogel, Vater, viel, vier – und alle mit ver- und vor-.',
  vw: 'In manchen Wörtern aus anderen Sprachen klingt V wie w: Vase, Vulkan, Pullover.',
  ent: 'ent- ist eine Vorsilbe: entdecken, entscheiden. end- gehört zu Ende: endlich, Endspiel. Frag: Hat es mit dem Ende zu tun?',
  naht: 'Treffen zwei Bausteine aufeinander, behält jeder seine Buchstaben: Fahr + rad = Fahrrad, Schiff + fahrt = Schifffahrt.',
  xlaut: 'Den x-Laut (ks) kann man x, chs, ks, cks oder gs schreiben: Hexe, Fuchs, Keks, Klecks, unterwegs. Meist sind es Merkwörter.',
  tion: 'Die Endung -tion spricht man „zion“, schreibt sie aber mit t: Station, Information.',
  th: 'In manchen Wörtern aus dem Griechischen steht th, gesprochen wie t: Theater, Mathematik.',
  ph: 'ph spricht man wie f: Alphabet, Strophe, Physik.',
  y: 'y klingt mal wie ü (Gymnasium) und am Ende wie i (Handy, Hobby).',
  nomen: 'Nomen schreibt man groß. Kannst du der, die oder das davorsetzen? Enden sie auf -ung, -heit, -keit, -nis oder -schaft? Dann sind es Nomen.',
  nominal: 'Steht ein Begleiter davor (das, beim, zum, etwas, viel, nichts, alles), wird aus einem Verb oder Wie-Wort ein Nomen: beim Lesen, etwas Neues.',
  klein: 'Kein Begleiter, kein Nomen: Verben, Wie-Wörter und Zeitangaben wie abends oder montags schreibt man klein.',
  baustein: 'Wörter sind aus Bausteinen gebaut: Vorsilbe + Wortstamm + Endung. Der Stamm bleibt in der ganzen Familie gleich.',
};

const part = (word, key) => { const k = knacks(word).find(item => item.key === key); return k ? word.text.slice(k.start, k.end) : ''; };
const swing = word => word.syllables.join(' – ');
/** A short tip in a child's words, spoken by Schreibi after a task. */
export function tipFor(key, word) {
  const help = word.help, text = word.text, p = part(word, key), stem = word.family?.[0];
  switch (key) {
    case 'vokal': case 'silben': return `Schwing das Wort: ${swing(word)}. In jeder Silbe steckt ein Selbstlaut.`;
    case 'betonung': return `Schwing das Wort und betone mal jede Silbe: ${swing(word)}. Welche klingt richtig?`;
    case 'laenge': case 'paar': return `Hör genau auf den betonten Selbstlaut in ${text}: ${vowelInfo(word).length === 'kurz' ? 'kurz und knapp' : vowelInfo(word).length === 'zwie' ? 'ein Zwielaut' : 'lang gezogen'}.`;
    case 'einfach': return `Das ${vowelInfo(word).nucleus} in ${text} ist lang. Danach kommt nur ein Mitlaut: ${p}.`;
    case 'doppel': return `Schwing das Wort: ${swing(word)}. Kurzer Selbstlaut, nur ein Mitlaut zu hören – also doppelt: ${p}.`;
    case 'ck': return `Kurzer Selbstlaut, dann ein k-Laut: Du schreibst ck – nie kk.`;
    case 'tz': return `Kurzer Selbstlaut, dann ein z-Laut: Du schreibst tz – nie zz.`;
    case 'nachmitlaut': return `In ${text} kommt vor dem ${p} schon ein l, n oder r. Nach l, n, r steht nie tz und nie ck.`;
    case 'stamm': return help ? `Verlängere: ${help}. Dort hörst du die Verdopplung – und der Stamm behält sie: ${p}.` : `Der Wortstamm behält seine doppelten Buchstaben: ${p}.`;
    case 'ie': return 'Klingt das i lang? Dann schreibst du fast immer ie.';
    case 'imerk': return `${text} hat ein langes i, aber ohne e. Merkwort!`;
    case 'ikurz': return `Das i in ${text} ist kurz. Ein kurzes i schreibt man nur mit i.`;
    case 'ih': return `${text} gehört zur ih-Familie: ihm, ihn, ihr, ihnen, ihre.`;
    case 'wieder': return /^wied/i.test(text) ? `wieder heißt hier „noch einmal“ – darum mit ie.` : `wider heißt hier „gegen“ – darum nur mit i.`;
    case 'dehnung': return stem ? `Das h in ${text} hörst du nicht. Aber die Familie hilft: ${word.family.slice(0, 2).join(', ')} – alle mit h.` : `Das h in ${text} hörst du nicht. Es steht vor l, m, n oder r. Merkwort!`;
    case 'ohneh': return `${text} hat einen langen Selbstlaut vor l, m, n oder r – aber kein h. Merkwort!`;
    case 'silbenh': return help ? `Verlängere: ${help}. Dann hörst du das h zwischen den Silben.` : `Schwing das Wort: ${swing(word)}. Da ist das h!`;
    case 'doppelvokal': return `${text} hat einen doppelten Selbstlaut: ${p}. Merkwort!`;
    case 'sz': return help ? `Langer Selbstlaut oder Zwielaut, scharfes s: ß. Verlängere: ${help}.` : 'Nach einem langen Selbstlaut oder Zwielaut schreibst du ß.';
    case 'ss': return stem ? `Kurzer Selbstlaut: ss. Verwandt ist ${stem} – dort ist der Selbstlaut lang.` : 'Kurzer Selbstlaut, scharfes s: Du schreibst ss.';
    case 'dass': return text === 'das' ? 'Du kannst „dieses“ oder „welches“ einsetzen – also das mit einem s.' : 'Hier passt weder „dieses“ noch „welches“ – also dass mit ss.';
    case 'seitseid': return text === 'seit' ? 'Es geht um Zeit: seit mit t.' : 'Es gehört zu ihr: Ihr seid – mit d.';
    case 'auslaut': return help ? `Verlängere das Wort: ${help}. Jetzt hörst du, dass hier ${p} steht!` : `Am Ende steht ${p}. Verlängere das Wort, dann hörst du es.`;
    case 'ig': return `Am Ende hörst du ich, aber du schreibst ig. Verlängere: ${help || text + 'e'}.`;
    case 'lich': return `-lich ist ein Baustein – immer mit ch. Verlängere: ${text}e.`;
    case 'ableiten': return help ? `${text} ist verwandt mit ${help}. Darum schreibst du ${p}.` : `${text} hat ${p} – such ein verwandtes Wort mit a oder au.`;
    case 'ableitenNein': return `Zu ${text} gibt es kein verwandtes Wort mit a oder au. Darum ${p}.`;
    case 'v': return word.parts?.some(x => /^v(er|or)$/i.test(x)) ? 'ver- und vor- schreibt man immer mit V.' : `Du hörst f, aber du schreibst V – wie beim Vogel. Merkwort!`;
    case 'vw': return `In ${text} klingt das V wie ein w. Merkwort!`;
    case 'ent': return /end/i.test(p + text.slice(0, 4)) && /end/i.test(text) ? `${text} hat mit dem Ende zu tun – darum end mit d.` : `ent- ist eine Vorsilbe, hat nichts mit Ende zu tun – darum mit t.`;
    case 'naht': return word.parts ? `Zerleg das Wort: ${word.parts.join(' + ')}. Jeder Baustein behält seine Buchstaben.` : 'An der Naht treffen gleiche Buchstaben aufeinander. Alle bleiben!';
    case 'xlaut': return `Der x-Laut in ${text} wird ${p} geschrieben. Merkwort!`;
    case 'tion': return 'Du hörst „zion“, schreibst aber -tion.';
    case 'th': return 'th wird wie t gesprochen. Fremdwort – merken!';
    case 'ph': return 'ph wird wie f gesprochen. Fremdwort – merken!';
    case 'y': return `Das y in ${text} klingt wie ${/y$/.test(text) ? 'i' : 'ü'}. Fremdwort – merken!`;
    case 'nomen': return word.parts?.some(x => /^(ung|heit|keit|nis|schaft)$/i.test(x)) ? `${text} endet auf -${word.parts.at(-1)}. Solche Wörter sind Nomen – groß!` : `${text} ist hier ein Nomen. ${word.article ? `Du kannst ${word.article} davorsetzen.` : 'Es steht ein Begleiter davor.'} Groß!`;
    case 'nominal': return `Vor ${text} steht ein Begleiter. Damit ist es hier ein Nomen – groß!`;
    case 'klein': return `${text} ist hier kein Nomen – kein Begleiter davor. Also klein!`;
    case 'baustein': return word.parts ? `Die Bausteine: ${word.parts.join(' + ')}.` : `Schwing das Wort: ${swing(word)}.`;
    case 'sp': return 'Am Anfang hörst du schp, aber du schreibst sp.';
    case 'st': return 'Am Anfang hörst du scht, aber du schreibst st.';
    default: return `Schau dir ${text} genau an und merk es dir gut.`;
  }
}
