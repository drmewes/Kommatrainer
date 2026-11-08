'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CloudFog, Crown, FileSearch, Flag, LockKeyhole, PartyPopper, Route, Volume2 } from 'lucide-react';
import { childName } from '../lib/engine.mjs';
import { isSatzMode, nextRegion, regionProgress, regions, satzStepInfo, SENTENCE_STEPS, STORY } from '../lib/satzland.mjs';
import { speak, stopSpeaking } from '../lib/sound';
import type { SatzMode, Store } from '../lib/types';
import { Meter, SpeakText, Stars } from './ui';
import SatzRound, { img, type Region } from './SatzlandRound';

const all = regions as unknown as Region[];
const stepIcon: Record<SatzMode, typeof BookOpen> = { 'satz-lernen': BookOpen, 'satz-koenige': Crown, 'satz-grenzweg': Route, 'satz-setzen': Flag, 'satz-text': FileSearch, 'satz-fest': PartyPopper };
const labelsOf: Partial<Record<SatzMode, string>> = { 'satz-koenige': 'Könige gefunden', 'satz-grenzweg': 'Grenzweg', 'satz-setzen': 'Selbst gesetzt', 'satz-text': 'Textdetektiv', 'satz-fest': 'Grenzfest' };
// What the training place asks Satzland to do: a step in a region, or only the story.
export type SatzStart = { regionId: string; mode: SatzMode | 'story' };

/** The region and step Satzland suggests next. */
export function nextStep(store: Pick<Store, 'attempts' | 'sessions'>) {
  const region = nextRegion(store.attempts, store.sessions) as unknown as Region, p = regionProgress(region, store.attempts, store.sessions);
  return { region, mode: (p.next || p.steps.find(m => m !== 'satz-lernen') || 'satz-lernen') as SatzMode };
}

/** Satzland on the training place: one box like the word training next to it, but a comic kingdom inside.
 * The princess says what comes next, the steps lie on a path, one box shows the progress of all regions. */
export function SatzPanel({ store, onStart }: { store: Store; onStart: (start: SatzStart) => void }) {
  const settings = store.settings, name = childName(settings);
  // Until Lotta picks a region, the panel follows the suggestion (it changes once the progress has loaded).
  const [regionId, setRegionId] = useState<string | null>(null);
  const region = all.find(r => r.id === regionId && r.built) || nextStep(store).region;
  const p = regionProgress(region, store.attempts, store.sessions), built = all.filter(r => r.built);
  const progress = new Map(built.map(r => [r.id, regionProgress(r, store.attempts, store.sessions)]));
  const freed = built.filter(r => progress.get(r.id)?.freed).length;
  const next = (p.next || null) as SatzMode | null;
  const talk = p.freed ? `${region.name} ist befreit, ${name}! Willst du weiterüben oder ins nächste Gebiet?` : !p.started ? `Hilfe, ${name}! Kleckser war in ${region.name}. Schau dir zuerst an, was passiert ist.` : next ? `Super gemacht! Jetzt kommt ${satzStepInfo[next].label}.` : `${region.name} wartet auf dich!`;
  const solved = p.solved as Record<string, number>;
  return <>
    <section className={'panel learning-dashboard satz-dashboard satz-comic' + (settings.effects ? '' : ' still')}>
      <img className="satz-kleckser-peek" src={img('kleckser')} alt="" aria-hidden="true"/>
      {/* The heading is plain text in the sky; on the free stretch of wall one pole per region: its flag is back once the region is freed, otherwise Kleckser has inked it away. */}
      <div className="satz-banner" data-tour="kingdom"><img src={img('banner-burg')} alt=""/>
        <div className="satz-title"><h1>Königreich Satzland</h1><p>{freed} von {built.length} Gebieten befreit</p></div>
        <button type="button" className="satz-story-link" onClick={() => onStart({ regionId: region.id, mode: 'story' })}><BookOpen size={18}/>Die Geschichte</button>
        <ol className="satz-flags" aria-label={`${freed} von ${built.length} Gebieten befreit`} style={{ '--n': built.length } as CSSProperties}>{built.map(r => {
          const won = !!progress.get(r.id)?.freed;
          return <li key={r.id} className={won ? 'won' : ''} title={`${r.n}. ${r.name}${won ? ' – befreit' : ''}`}><img src={img(won ? 'fahne-frei' : 'fahne-leer')} alt=""/></li>;
        })}</ol>
      </div>
      <div className="satz-region-row" data-tour="region">
        <label className="field"><span>Dein Gebiet</span><select value={region.id} onChange={e => setRegionId(e.target.value)}>{all.map(r => <option key={r.id} value={r.id} disabled={!r.built}>{r.n}. {r.name} · {r.rule}{r.built ? progress.get(r.id)?.freed ? ' ✓' : '' : ' (im Nebel)'}</option>)}</select></label>
        <span className="satz-rule-tag"><Crown size={15}/>{region.rule}</span>
      </div>
      <div className="satz-comic-row">
        <figure className="satz-comic-panel">
          <img src={img(region.image)} alt=""/>
          <figcaption><strong>Gebiet {region.n}: {region.name}</strong>{region.story}<SpeakText text={region.story} prefs={settings}/></figcaption>
        </figure>
        <div className="satz-princess" data-tour="mission">
          <p className="satz-bubble">{talk}<SpeakText text={talk} prefs={settings}/></p>
          <img src={img('princess-head')} alt="Die Prinzessin von Satzland"/>
          {next && <button type="button" className="satz-go" onClick={() => onStart({ regionId: region.id, mode: next })}>Los: {satzStepInfo[next].label}<ArrowRight size={18}/></button>}
        </div>
      </div>
      <ol data-tour="satz-path" className={'satz-path n' + p.steps.length} aria-label={'Dein Weg durch ' + region.name}>{p.steps.map((mode, i) => {
        const m = mode as SatzMode, Icon = stepIcon[m], isOpen = p.open[mode], done = p.done[mode], here = mode === next;
        return <li key={mode}><button type="button" className={'satz-node ' + mode + (here ? ' next' : '') + (done ? ' done' : '') + (!isOpen ? ' locked' : '')} disabled={!isOpen} title={isOpen ? satzStepInfo[m].hint : lockedHint(p.steps[i - 1] as SatzMode)} onClick={() => onStart({ regionId: region.id, mode: m })}>
          <span className="satz-shield">{isOpen ? <Icon size={26}/> : <LockKeyhole size={20}/>}{done && <span className="satz-done"><Check size={12} strokeWidth={4}/></span>}</span>
          <strong>{satzStepInfo[m].label}</strong>
          {here ? <small>Jetzt dran!</small> : done ? <small>geschafft</small> : null}
        </button></li>;
      })}</ol>
      <section className="satz-progress" data-tour="satz-progress" aria-label="Dein Fortschritt in Satzland">
        <div className="year-heading"><span className="year-title"><Flag size={18}/>Dein Weg durch Satzland</span><span className="year-count"><strong>{freed}</strong> von {built.length} befreit</span></div>
        <ol className="satz-crests">{all.map(r => {
          const rp = progress.get(r.id), label = `${r.n}. ${r.name}: ${r.rule}${r.built ? rp?.freed ? ' – befreit' : '' : ' (noch im Nebel)'}`;
          return <li key={r.id}><button type="button" className={'satz-crest' + (rp?.freed ? ' freed' : rp?.started ? ' started' : '') + (r.id === region.id ? ' current' : '') + (!r.built ? ' fog' : '')} title={label} aria-label={label} disabled={!r.built} onClick={() => setRegionId(r.id)}>{rp?.freed ? <Flag size={14}/> : r.built ? r.n : <CloudFog size={13}/>}</button></li>;
        })}</ol>
        <div className="satz-stats" style={{ '--stats': p.steps.length - 1 } as CSSProperties}>{p.steps.filter(m => m !== 'satz-lernen').map(mode => {
          const m = mode as SatzMode, sentence = SENTENCE_STEPS.includes(mode);
          return <span key={mode} className={'satz-stat' + (p.done[mode] ? ' done' : '')}><b>{labelsOf[m] || satzStepInfo[m].label}</b>{sentence ? <><em>{solved[mode]}/{p.total}</em><Meter value={solved[mode] / p.total * 100} label={satzStepInfo[m].label}/></> : mode === 'satz-fest' ? p.freed ? <Stars count={p.stars} size={15}/> : <em>–</em> : <em>{p.texts ? '✓' : '–'}</em>}</span>;
        })}</div>
      </section>
    </section>
  </>;
}

// The story and the rounds. On the very first visit the story comes before the first step.
export default function Satzland({ store, paused, start, onExit }: { store: Store; paused: boolean; start: SatzStart; onExit: () => void }) {
  const visited = store.sessions.some(s => isSatzMode(s.mode)) || store.attempts.some(a => isSatzMode(a.mode));
  type Screen = { kind: 'story'; page: number; then: SatzMode | null } | { kind: 'round'; mode: SatzMode; run: number };
  const [screen, setScreen] = useState<Screen>(() => start.mode === 'story' ? { kind: 'story', page: 0, then: null } : !visited ? { kind: 'story', page: 0, then: start.mode } : { kind: 'round', mode: start.mode, run: 0 });
  useEffect(() => { window.scrollTo({ top: 0 }); return () => stopSpeaking(); }, [screen.kind]);
  const region = all.find(r => r.id === start.regionId) || all[0];
  if (screen.kind === 'story') return <Story page={screen.page} store={store} onPage={page => setScreen({ ...screen, page })} onDone={() => screen.then ? setScreen({ kind: 'round', mode: screen.then, run: 0 }) : onExit()}/>;
  return <SatzRound key={screen.mode + screen.run} store={store} region={region} mode={screen.mode} paused={paused} onExit={onExit} onNext={mode => setScreen(prev => ({ kind: 'round', mode, run: prev.kind === 'round' ? prev.run + 1 : 0 }))}/>;
}

function Story({ page, store, onPage, onDone }: { page: number; store: Store; onPage: (page: number) => void; onDone: () => void }) {
  const part = STORY[page], last = page === STORY.length - 1;
  useEffect(() => { speak(part.text, store.settings); return () => stopSpeaking(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="panel satz-story comic-round sl-round comic-sheet">
    <div className="satz-story-image"><img src={img(part.image)} alt="" className={['kleckser', 'princess'].includes(part.image) ? 'contain' : ''}/></div>
    <div className="satz-story-body">
      <span className="eyebrow">Die Geschichte von Satzland · {page + 1}/{STORY.length}</span>
      <p className="satz-story-text">{part.text}</p>
      <div className="sl-actions">
        {page > 0 && <button type="button" className="button secondary" onClick={() => onPage(page - 1)}><ArrowLeft size={18}/>Zurück</button>}
        <button type="button" className="listen-button" onClick={() => speak(part.text, store.settings)}><Volume2 size={20}/><span>Nochmal hören</span></button>
        <button type="button" className="button primary big" autoFocus onClick={() => last ? onDone() : onPage(page + 1)}>{last ? 'Los geht’s!' : 'Weiter'}<ArrowRight size={20}/></button>
      </div>
    </div>
  </section>;
}

const lockedHint = (before: SatzMode) => before === 'satz-lernen' ? 'Erst kennenlernen' : before === 'satz-text' ? 'Erst den Textdetektiv' : `Erst die Hälfte in „${satzStepInfo[before].label}“`;

