'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Crown, Lightbulb, RotateCcw, Volume2 } from 'lucide-react';
import { childName, HOME_EVENT, MASCOT, uid } from '../lib/engine.mjs';
import { pointsFor } from '../lib/learning.mjs';
import { checkCommas, checkKings, decisionScore, explain, kingCount, kingWords, needsComma, parseSentence, pickText, regionProgress, roundSentences, satzStepInfo, withCommas } from '../lib/satzland.mjs';
import { playSound, speak, stopSpeaking } from '../lib/sound';
import type { Attempt, SatzMode, Session, Store } from '../lib/types';
import { Confetti, Mascot, Modal, PointsPill, Stars } from './ui';
import { CastHost, CastRascal, type CastMood } from './WorldCast';

export type Sentence = ReturnType<typeof parseSentence>;
export type SatzText = { id: string; title: string; sentences: Sentence[] };
export type Region = { id: string; n: number; image: string; name: string; rule: string; kind: string; built: boolean; textsOnly?: boolean; story: string; merksatz: string; tip: string; examples: Sentence[]; sentences: Sentence[]; profi: Sentence[]; texts: SatzText[]; fest: SatzText };
type Task = 'kings' | 'commas';
// One thing to solve: a single sentence or a whole text. Grenzweg items ask two questions first.
type Item = { key: string; title?: string; sentences: Sentence[]; task: Task; guided?: boolean; askList?: boolean; hints: boolean; fix: boolean };
type Result = ReturnType<typeof checkCommas>;

export const img = (name: string) => `/satzland/${name}.webp`;
const praise = ['Stark!', 'Genau!', 'Klasse!', 'Richtig!', 'Perfekt gesetzt!', 'Die Grenze steht!'];
// Read in event handlers only; the round's clock starts in an effect.
const clock = () => Date.now();
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const arrivals: Record<SatzMode, string> = {
  'satz-lernen': 'Hör zu, dann probieren wir es zusammen.',
  'satz-koenige': 'Wer regiert hier? Tippe alle Könige an.',
  'satz-grenzweg': 'Wir gehen den Grenzweg: Ich frage, du entscheidest.',
  'satz-setzen': 'Tippe auf die Lücken, wo ein Grenzposten fehlt.',
  'satz-text': 'Textdetektiv! Kleckser war hier. Finde alle fehlenden Grenzposten.',
  'satz-fest': 'Das Grenzfest! Zeig, dass du dieses Gebiet befreien kannst.',
};

/* ---------- The sentence itself: words to tap for kings, gaps to tap for border posts ---------- */

export function SentenceView({ s, task = 'show', picked, marks, showKings = false, colors = false, glow = -1, disabled = false, onWord, onGap }: {
  s: Sentence; task?: Task | 'show' | 'plain'; picked?: Set<number>; marks?: string[] | null; showKings?: boolean; colors?: boolean; glow?: number; disabled?: boolean; onWord?: (i: number) => void; onGap?: (i: number) => void;
}) {
  return <span className="sl-sentence" lang="de">{s.words.map((w, i) => {
    const king = task === 'kings' ? picked?.has(i) || (marks?.[i] === 'missing') : showKings && w.king !== null;
    const wordMark = task === 'kings' ? marks?.[i] : undefined, gapMark = task === 'commas' ? marks?.[i] : undefined;
    const cls = ['sl-word', colors && s.kingdoms[i] ? 'k' + ((s.kingdoms[i] - 1) % 4 + 1) : '', colors && s.bridge[i] ? 'bridge' : '', king ? 'king' : '', wordMark ? 'mark-' + wordMark : ''].filter(Boolean).join(' ');
    const crown = king && <Crown className="sl-crown" size={18} aria-hidden="true"/>;
    const word = task === 'kings' && onWord ? <button type="button" className={cls} disabled={disabled} aria-pressed={!!picked?.has(i)} onClick={() => onWord(i)}>{crown}{w.text}</button> : <span className={cls}>{crown}{w.text}</span>;
    let gap = null;
    if (i < s.gaps.length) {
      if (task === 'commas') {
        const set = !!picked?.has(i) || gapMark === 'missing';
        gap = <button type="button" className={'sl-gap' + (set ? ' set' : '') + (gapMark ? ' mark-' + gapMark : '') + (glow === i ? ' glow' : '')} disabled={disabled} aria-pressed={!!picked?.has(i)} aria-label={`Grenzposten nach „${w.text}“`} onClick={() => onGap?.(i)}><span className="sl-comma" aria-hidden="true">,</span></button>;
      } else if (task === 'plain') gap = <span className="sl-space"/>;
      else gap = <span className={'sl-space' + (s.gaps[i] === 'yes' ? ' post' : s.gaps[i] === 'optional' ? ' free' : '')}>{s.gaps[i] === 'yes' ? ',' : s.gaps[i] === 'optional' ? '(,)' : ''}</span>;
    }
    return <span key={i} className="sl-unit">{word}{gap}{i === s.words.length - 1 && <span className="sl-end">{s.end}</span>}</span>;
  })}</span>;
}

/* ---------- One item: a sentence or a text, with hints, checking, explanation and one chance to improve ---------- */

function ItemTask({ item, settings, onRecord, onDone, paused }: { item: Item; settings: Store['settings']; paused: boolean; onRecord: (s: Sentence, result: Result, first: boolean, hint: boolean) => void; onDone: (allCorrect: boolean) => void }) {
  const [picked, setPicked] = useState<Set<number>[]>(() => item.sentences.map(() => new Set()));
  const [phase, setPhase] = useState<'count' | 'list' | 'answer' | 'checked' | 'final'>(item.guided ? 'count' : 'answer');
  const [marks, setMarks] = useState<(string[] | null)[]>(() => item.sentences.map(() => null));
  const [results, setResults] = useState<Result[] | null>(null), [tries, setTries] = useState(0), [hint, setHint] = useState(0), [guidedMiss, setGuidedMiss] = useState(false);
  const [question, setQuestion] = useState<{ answer: string; right: boolean; why: string } | null>(null);
  const one = item.sentences[0], text = item.sentences.length > 1, kings = item.task === 'kings';
  const shown = phase !== 'count' && phase !== 'list';
  const showKings = item.guided ? phase !== 'count' || !!question : hint >= 1, colors = item.guided ? shown : !kings && hint >= 2;
  const firstMissing = (() => { for (const [si, s] of item.sentences.entries()) for (const [gi, g] of s.gaps.entries()) if (g === 'yes' && !picked[si].has(gi)) return [si, gi]; return null; })();
  const speakAll = (final: boolean) => speak(item.sentences.map(s => final ? s.text : s.plain).join(' '), settings);
  const toggle = (si: number, i: number) => {
    if (phase !== 'answer' || paused) return;
    playSound('tap', settings.sound);
    setPicked(prev => prev.map((set, k) => { if (k !== si) return set; const next = new Set(set); if (next.has(i)) next.delete(i); else next.add(i); return next; }));
  };
  function check() {
    const res = item.sentences.map((s, si) => kings ? checkKings(s, picked[si]) : checkCommas(s, picked[si]));
    const first = tries === 0, usedHint = hint > 0 || guidedMiss;
    item.sentences.forEach((s, si) => { if (first || !results?.[si].correct) onRecord(s, res[si], first, usedHint); });
    setResults(res); setMarks(res.map(r => r.marks));
    const all = res.every(r => r.correct);
    playSound(all ? 'perfect' : 'wrong', settings.sound);
    if (all || !item.fix || tries > 0) setPhase('final'); else setPhase('checked');
  }
  function improve() { setTries(1); setMarks(item.sentences.map(() => null)); setPhase('answer'); }
  // Grenzweg questions: how many kings, and with one king: is something listed?
  const count = kingCount(one), lists = one.kinds.some((k, i) => k === 'liste' && one.gaps[i] === 'yes');
  function answerCount(n: number) {
    const right = n === count, names = [...new Set(one.words.filter(w => w.king !== null).map(w => w.king))].map(k => '„' + kingWords(one, k) + '“').join(', ');
    if (!right) setGuidedMiss(true);
    playSound(right ? 'accepted' : 'wrong', settings.sound);
    setQuestion({ answer: String(n), right, why: `${right ? 'Genau: ' : 'Schau genau hin: '}${count === 1 ? 'Hier regiert ein König' : `Hier regieren ${count} Könige`}: ${names}.` });
  }
  function answerList(yes: boolean) {
    const right = yes === lists;
    if (!right) setGuidedMiss(true);
    playSound(right ? 'accepted' : 'wrong', settings.sound);
    setQuestion({ answer: yes ? 'ja' : 'nein', right, why: lists ? `${right ? 'Richtig: ' : ''}Hier wird aufgezählt. Zwischen den Dingen kommen Grenzposten, an der Brücke „und“/„oder“ nicht.` : `${right ? 'Richtig: ' : ''}Hier wird nichts aufgezählt. Ein König, ein Reich: Dann braucht es meistens keinen Grenzposten.` });
  }
  function nextQuestion() { const after = phase === 'count' && count === 1 && item.askList ? 'list' : 'answer'; setQuestion(null); setPhase(after); }

  // What Schreibi says under the sentence after checking.
  const notes: string[] = [];
  if (results) {
    item.sentences.forEach((s, si) => {
      const r = results[si];
      if (kings) {
        r.marks.forEach((m, i) => {
          if (m === 'missing') { const parts = s.words.filter(w => w.king === s.words[i].king); notes.push(parts.length > 1 ? `„${s.words[i].text}“ gehört zum König: ${parts.map(w => w.text).join(' … ')}. Ein König kann zwei Teile haben.` : `„${s.words[i].text}“ ist ein König. Frag: Was tut jemand? Was passiert?`); }
          if (m === 'extra') notes.push(`„${s.words[i].text}“ ist kein König, sondern gehört zu seinem Volk.`);
        });
      } else r.marks.forEach((m, i) => { if (m === 'missing' || m === 'extra') notes.push(explain(s, i, m === 'extra')); });
    });
    if (!notes.length && !kings && !text) notes.push(needsComma(one) ? explain(one, one.gaps.indexOf('yes'), true) : kingCount(one) > 1 ? 'Kein Grenzposten nötig: Die Brücke „und“/„oder“ verbindet die Reiche.' : 'Kein Grenzposten nötig: Hier regiert nur ein König über ein Reich.');
  }
  const allRight = !!results && results.every(r => r.correct);
  useEffect(() => { if (phase === 'final' || phase === 'checked') { const line = allRight ? notes[0] || '' : notes[0]; if (line) speak(line, settings); } return () => stopSpeaking(); }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const instruction = phase === 'count' ? 'Wie viele Könige regieren in diesem Satz?' : phase === 'list' ? 'Zählt der Satz etwas auf?'
    : kings ? (text ? 'Tippe in jedem Satz alle Könige an.' : 'Tippe alle Könige an. Ein König kann zwei Teile haben.')
    : item.guided ? 'Die Farben zeigen die Königreiche. Wo braucht es einen Grenzposten?' : text ? 'Tippe auf die Lücken, wo ein Grenzposten fehlt.' : 'Wo fehlt ein Grenzposten? Tippe auf die Lücke.';
  return <div className={'sl-task' + (text ? ' text' : '')}>
    {item.title && <h3 className="sl-text-title">{item.title}</h3>}
    <p className="sl-instruction">{instruction}</p>
    <div className={'sl-board' + (text ? ' sl-text' : '') + (phase === 'final' ? (allRight ? ' right' : ' wrong') : '')}>
      {item.sentences.map((s, si) => <SentenceView key={s.id} s={s} task={kings ? 'kings' : phase === 'count' || phase === 'list' ? 'plain' : 'commas'} picked={picked[si]} marks={marks[si]}
        showKings={showKings && !kings} colors={colors} glow={hint >= 3 && firstMissing?.[0] === si ? firstMissing[1] : -1} disabled={phase !== 'answer' || paused}
        onWord={i => toggle(si, i)} onGap={i => toggle(si, i)}/>)}
    </div>
    <div className="sl-tools"><button type="button" className="listen-button" onClick={() => speakAll(phase === 'final')}><Volume2 size={20}/><span>{text ? 'Text vorlesen' : 'Vorlesen'}</span></button></div>
    {(phase === 'count' || phase === 'list') && <div className="sl-question">
      {!question ? <div className="sl-choices">{phase === 'count' ? [1, 2, 3, 4].filter(n => n <= Math.max(3, count + 1)).map(n => <button key={n} type="button" className="sl-choice" onClick={() => answerCount(n)}>{n}</button>)
        : <><button type="button" className="sl-choice" onClick={() => answerList(true)}>Ja</button><button type="button" className="sl-choice" onClick={() => answerList(false)}>Nein</button></>}</div>
        : <div className={'sl-why ' + (question.right ? 'right' : 'wrong')}><p>{question.why}</p><button type="button" className="button primary" autoFocus onClick={nextQuestion}>Weiter<ArrowRight size={18}/></button></div>}
    </div>}
    {phase === 'answer' && <div className="sl-actions">
      <button type="button" className="button primary big" onClick={check}>Prüfen</button>
      {item.hints && !item.guided && hint < (kings ? 2 : 3) && <button type="button" className="hint-button" onClick={() => { setHint(h => h + 1); playSound('hint', settings.sound); }}><Lightbulb size={17}/>{kings ? hint === 0 ? `${MASCOT}s Tipp` : 'Noch ein Tipp' : hint === 0 ? 'Zeig die Könige' : hint === 1 ? 'Zeig die Königreiche' : 'Zeig eine Lücke'}</button>}
      {item.hints && kings && hint >= 1 && <p className="hint-box"><Lightbulb size={17}/>{hint === 1 ? 'Frag: Was tut jemand? Was passiert? Sag den Satz für gestern: Das Wort, das sich ändert, gehört zum König.' : `In ${text ? 'jedem Satz' : 'diesem Satz'} regiert ${text ? 'mindestens ein König' : kingCount(one) === 1 ? 'ein König' : kingCount(one) + ' Könige'}. Vergiss die zweiten Teile nicht (an, auf, mit, gesehen …).`}</p>}
      {item.hints && !kings && hint >= 3 && !firstMissing && <p className="hint-box"><Lightbulb size={17}/>Es fehlt kein Grenzposten mehr. Prüf, ob einer zu viel ist.</p>}
    </div>}
    {(phase === 'checked' || phase === 'final') && <div className={'sl-feedback ' + (allRight ? 'right' : 'wrong')} aria-live="polite">
      <strong>{allRight ? pick(praise) : phase === 'checked' ? 'Fast! Schau dir die roten Stellen an.' : 'So ist es richtig:'}</strong>
      {notes.slice(0, text ? 3 : 2).map((n, i) => <p key={i}>{n}</p>)}
      {phase === 'final' && !allRight && <div className={'sl-solution' + (text ? ' sl-text' : '')}>{item.sentences.map(s => <SentenceView key={s.id} s={s} task={kings ? 'kings' : 'show'} picked={new Set(s.words.map((w, i) => w.king !== null ? i : -1))} showKings colors/>)}</div>}
      <div className="sl-actions">
        {phase === 'checked' ? <button type="button" className="button primary big" autoFocus onClick={improve}><RotateCcw size={18}/>Verbessern</button>
          : <button type="button" className="button primary big" autoFocus onClick={() => onDone(allRight)}>Weiter<ArrowRight size={20}/></button>}
      </div>
    </div>}
  </div>;
}

/* ---------- A round: Kennenlernen, Könige finden, Grenzweg, Grenzposten setzen, Textdetektiv, Grenzfest ---------- */

export default function SatzRound({ store, region, mode, paused, onExit, onNext }: { store: Store; region: Region; mode: SatzMode; paused: boolean; onExit: () => void; onNext: (mode: SatzMode) => void }) {
  const settings = store.settings, name = childName(settings);
  const coreTask: Task = region.kind === 'koenige' ? 'kings' : 'commas';
  // The question about listing only comes up where lists are practised.
  const lists = region.sentences.some(s => s.kinds.some((k, i) => k === 'liste' && s.gaps[i] === 'yes'));
  const [items] = useState<Item[]>(() => {
    if (mode === 'satz-lernen') return [{ key: 'try', sentences: [region.textsOnly ? region.examples[0] : region.sentences[0]], task: coreTask, guided: false, hints: true, fix: true }];
    if (mode === 'satz-koenige') return roundSentences(region, mode, store.attempts).map(s => ({ key: s.id, sentences: [s], task: 'kings' as Task, hints: true, fix: true }));
    if (mode === 'satz-grenzweg') return roundSentences(region, mode, store.attempts).map(s => ({ key: s.id, sentences: [s], task: 'commas' as Task, guided: true, askList: lists, hints: false, fix: true }));
    if (mode === 'satz-setzen') return roundSentences(region, mode, store.attempts).map(s => ({ key: s.id, sentences: [s], task: 'commas' as Task, hints: true, fix: true }));
    if (mode === 'satz-text') { const t = pickText(region, store.sessions); return [{ key: t.id, title: t.title, sentences: t.sentences, task: coreTask, hints: true, fix: true }]; }
    return [...region.profi.map(s => ({ key: s.id, sentences: [s], task: coreTask, hints: false, fix: false })), { key: region.fest.id, title: region.fest.title, sentences: region.fest.sentences, task: coreTask, hints: false, fix: false }];
  });
  const [page, setPage] = useState(mode === 'satz-lernen' ? 0 : 2), [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0), [combo, setCombo] = useState(0), [summary, setSummary] = useState<Session | null>(null), [exitConfirm, setExitConfirm] = useState(false);
  const sessionId = useRef(''), started = useRef(0), asked = useRef(0), attempts = useRef<Attempt[]>([]), firsts = useRef<Result[]>([]), done = useRef(false);
  const item = items[index], before = useMemo(() => regionProgress(region, store.attempts, store.sessions), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [talk, setTalk] = useState(arrivals[mode]), [castMood, setCastMood] = useState<CastMood>('idle');

  // Ids and clocks start when the round mounts, not while rendering.
  useEffect(() => { sessionId.current = uid(); started.current = asked.current = Date.now(); }, []);
  useEffect(() => {
    const ask = (event: Event) => { if (attempts.current.length && !done.current) { event.preventDefault(); setExitConfirm(true); } };
    window.addEventListener(HOME_EVENT, ask); return () => window.removeEventListener(HOME_EVENT, ask);
  }, []);
  const leave = () => { if (attempts.current.length && !done.current) setExitConfirm(true); else onExit(); };

  function record(s: Sentence, result: Result, first: boolean, hint: boolean) {
    const kind = result.correct ? 'exact' : 'incorrect', nextCombo = result.correct && first && !hint ? combo + 1 : 0;
    const gained = mode === 'satz-lernen' ? (result.correct ? 5 : 0) : pointsFor(kind, first, nextCombo);
    const attempt: Attempt = { id: uid(), wordId: s.id, batchId: region.id, sessionId: sessionId.current, mode, input: item.task === 'kings' ? s.words.filter((_, i) => result.marks[i] === 'hit' || result.marks[i] === 'extra').map(w => w.text).join(' ') : withCommas(s, new Set(result.marks.map((m, i) => m === 'hit' || m === 'extra' || m === 'free' ? i : -1).filter(i => i >= 0))),
      expected: s.text, kind, distance: result.errors, first, hint, at: Date.now(), seconds: Math.round((Date.now() - asked.current) / 1000), points: gained, knack: null, guided: false };
    attempts.current.push(attempt); if (first) firsts.current.push(result);
    setCombo(nextCombo); setPoints(p => p + gained); setCastMood(result.correct ? 'right' : 'wrong');
    store.commit([{ id: attempt.id, kind: 'attempt', data: attempt }]);
  }
  function itemDone(right: boolean) {
    setCastMood('idle');
    setTalk(right ? pick(praise) : 'Weiter geht’s. Fehler gehören zum Grenzbauen dazu.');
    if (index + 1 < items.length) { setIndex(i => i + 1); asked.current = clock(); return; }
    finish();
  }
  function finish() {
    done.current = true;
    const score = Math.round(decisionScore(firsts.current)), firstsRight = attempts.current.filter(a => a.first && !a.hint && a.kind === 'exact').length;
    const stars = mode === 'satz-fest' ? settings.starThresholds.filter(t => score >= t).length : undefined;
    const freedNow = mode === 'satz-fest' && !before.freed && (stars || 0) > 0;
    const ids = [...new Set(attempts.current.map(a => a.wordId))];
    const session: Session = { id: sessionId.current, batchId: region.id, mode, at: Date.now(), score, exact: firstsRight, correct: attempts.current.filter(a => a.kind === 'exact').length, total: ids.length, points, wordIds: ids,
      duration: Math.round((Date.now() - started.current) / 1000), completed: true, ...(stars !== undefined ? { stars } : {}), ...(freedNow ? { completionBonus: 30 } : {}), allCorrect: ids.filter(id => attempts.current.some(a => a.wordId === id && a.kind === 'exact')).length, allTotal: ids.length };
    store.commit([{ id: session.id, kind: 'session', data: session }]);
    playSound('finish', settings.sound);
    setSummary(session);
  }

  if (summary) return <RoundSummary region={region} mode={mode} summary={summary} name={name} store={store} before={before} onExit={onExit} onNext={onNext}/>;
  const progress = mode === 'satz-lernen' ? page / 3 * 100 : index / items.length * 100;
  return <div className={'practice-page satz-page comic-round sl-round mode-' + mode}>
    <div className="practice-heading"><button className="text-button" onClick={leave}><ArrowLeft size={18}/>Trainingsplatz</button><span className="practice-title">{satzStepInfo[mode].label}</span><span className="points-pill"><PointsPill amount={points}/>{combo > 1 && <span className="combo">{combo}× Serie</span>}</span></div>
    <div className="trail-progress" role="progressbar" aria-label="Rundenfortschritt" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span className="trail" style={{ width: progress + '%' }}/><span className="trail-pencil" style={{ left: `calc(${progress / 100} * (100% - 32px))` }} aria-hidden="true">✏️</span><span className="trail-count">{mode === 'satz-lernen' ? `${Math.min(page + 1, 3)} / 3` : `${index + 1} / ${items.length}`}</span><CastRascal world="sl" mood={castMood}/></div>
    <div className="practice-layout">
      <aside className={'practice-companion' + (settings.effects ? ' arriving' : '')}><div className="speech-bubble" aria-live="polite">{talk}</div><div className="cast-stage"><CastHost world="sl" mood={castMood}/><Mascot small celebrate={castMood === 'right'} effects={settings.effects}/></div><span className="companion-caption">PRINZESSIN & {MASCOT.toUpperCase()}</span></aside>
      <section className="question-card panel satz-card">
        {page === 0 ? <div className="sl-story">
          <img src={img(region.image)} alt="" className="sl-story-image"/>
          <h2>{region.n}. {region.name}</h2>
          <p className="sl-story-text">{region.story}</p>
          <div className="sl-actions"><button type="button" className="listen-button" onClick={() => speak(region.story, settings)}><Volume2 size={20}/><span>Vorlesen</span></button><button type="button" className="button primary big" onClick={() => { stopSpeaking(); setPage(1); setTalk('Das ist die Regel für dieses Gebiet.'); }}>Zur Regel<ArrowRight size={20}/></button></div>
        </div>
        : page === 1 ? <div className="sl-rule">
          <p className="sl-merksatz"><Crown size={22}/>{region.merksatz}</p>
          <p className="tip-line"><Lightbulb size={18}/>{region.tip}</p>
          <ul className="sl-examples">{region.examples.map(s => <li key={s.id}><SentenceView s={s} showKings colors/><button type="button" className="speak-text" aria-label={'Vorlesen: ' + s.text} onClick={() => speak(s.text, settings)}><Volume2 size={16}/></button></li>)}</ul>
          <div className="sl-legend"><span><Crown size={15}/>König (Verb)</span><span className="k1">Königreich 1</span><span className="k2">Königreich 2</span><span className="post">, Grenzposten</span></div>
          <div className="sl-actions"><button type="button" className="listen-button" onClick={() => speak(region.merksatz + ' ' + region.tip, settings)}><Volume2 size={20}/><span>Regel vorlesen</span></button><button type="button" className="button primary big" onClick={() => { stopSpeaking(); setPage(2); setTalk('Jetzt du! Probier es aus.'); asked.current = Date.now(); }}>Ausprobieren<ArrowRight size={20}/></button></div>
        </div>
        : <ItemTask key={item.key} item={item} settings={settings} paused={paused || exitConfirm} onRecord={record} onDone={itemDone}/>}
      </section>
    </div>
    {exitConfirm && <Modal title="Runde beenden?" onClose={() => setExitConfirm(false)}><p>Deine Antworten bleiben gespeichert. Die Runde zählt aber erst, wenn du sie fertig machst.</p><div className="modal-actions"><button className="button secondary" onClick={() => setExitConfirm(false)}>Weitermachen</button><button className="button primary" onClick={onExit}>Runde verlassen</button></div></Modal>}
  </div>;
}

function RoundSummary({ region, mode, summary, name, store, before, onExit, onNext }: { region: Region; mode: SatzMode; summary: Session; name: string; store: Store; before: ReturnType<typeof regionProgress>; onExit: () => void; onNext: (mode: SatzMode) => void }) {
  const after = regionProgress(region, store.attempts, store.sessions), freed = !before.freed && after.freed;
  const opened = after.steps.find(m => after.open[m] && !before.open[m]);
  const next = after.next;
  const line = mode === 'satz-fest' ? freed ? `Hurra, ${name}! ${region.name} ist befreit. Kleckser hat dort keine Chance mehr.` : (summary.stars || 0) > 0 ? `Super, ${name}! ${region.name} bleibt sicher.` : 'Fast! Übe noch ein bisschen und versuch es dann noch einmal.'
    : opened ? `Klasse! Jetzt ist ${satzStepInfo[opened as SatzMode].label} offen.` : summary.exact === summary.total ? `Alles ohne Hilfe, ${name}!` : 'Geschafft! Jede Runde macht die Grenzen stärker.';
  useEffect(() => { speak(line, store.settings); return () => stopSpeaking(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="round-summary panel satz-summary comic-round sl-round comic-sheet"><Confetti show={store.settings.effects && (mode !== 'satz-fest' || (summary.stars || 0) > 0)}/>
    {mode === 'satz-fest' && <img src={img((summary.stars || 0) > 0 ? 'fest' : 'kleckser')} alt="" className="sl-summary-image"/>}
    <p className="speech-bubble summary-bubble" aria-live="polite">{line}</p>
    {mode === 'satz-fest' ? <Stars count={summary.stars || 0} size={40}/> : <div className="cast-stage summary-cast"><CastHost world="sl" mood="right"/><Mascot small celebrate effects={store.settings.effects}/></div>}
    {summary.completionBonus ? <p className="bonus-earned">+{summary.completionBonus} Punkte für das befreite Gebiet!</p> : null}
    <PointsPill amount={summary.points} label="Punkte in dieser Runde"/>
    {mode !== 'satz-lernen' && <div className="summary-stats"><div><strong>{summary.score}%</strong><span>{region.kind === 'koenige' ? 'Könige richtig' : 'Grenzen richtig'}</span></div><div><strong>{summary.exact}/{summary.total}</strong><span>{summary.total === 1 ? 'Text' : 'Sätze'} ohne Hilfe</span></div></div>}
    <div className="modal-actions">
      <button className="button secondary" onClick={onExit}>Zum Trainingsplatz</button>
      {next && next !== mode && <button className="button primary" autoFocus onClick={() => onNext(next as SatzMode)}>Weiter: {satzStepInfo[next as SatzMode].label}<ArrowRight size={18}/></button>}
      {next === mode && <button className="button primary" autoFocus onClick={() => onNext(mode)}>Noch eine Runde<ArrowRight size={18}/></button>}
    </div>
  </section>;
}
