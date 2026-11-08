'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, Check, CloudFog, Crown, Download, Flag, LockKeyhole, Settings2, Volume2 } from 'lucide-react';
import { childName, MASCOT } from '../lib/engine.mjs';
import { childVoice, germanVoices, pickVoice, speak } from '../lib/sound';
import { regionProgress, regions, satzStepInfo } from '../lib/satzland.mjs';
import type { SatzMode, Store } from '../lib/types';
import { date, Empty, Meter, Stars } from './ui';
import { ParentAccount } from './ParentLock';

type Tab = 'stats' | 'settings';

export default function Admin({ store, onLock, tutorialTab }: { store: Store; onLock?: () => void; tutorialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>('stats'), activeTab = tutorialTab || tab;
  const tabs: { id: Tab; icon: typeof BarChart3; label: string }[] = [
    { id: 'stats', icon: BarChart3, label: 'Lernstand' },
    { id: 'settings', icon: Settings2, label: 'Einstellungen' },
  ];
  return <div className="admin-page">
    <div className="admin-heading"><div><span className="eyebrow">Elternbereich</span><h1>Für die Eltern</h1>{onLock && <button type="button" className="text-button" onClick={onLock}><LockKeyhole size={16}/>Wieder sperren</button>}</div>
      <div className="segmented admin-tabs" data-tour="parent-tabs" role="tablist">{tabs.map(item => <button key={item.id} role="tab" aria-selected={activeTab === item.id} className={activeTab === item.id ? 'selected' : ''} onClick={() => setTab(item.id)}><item.icon size={17}/>{item.label}</button>)}</div></div>
    <div data-tour={'parent-' + activeTab}>{activeTab === 'stats' ? <KingdomStats store={store}/> : <SettingsPanel store={store}/>}</div>
  </div>;
}

/** Progress per region of Satzland: which steps are done, the stars of the border festival, and the latest rounds. */
function KingdomStats({ store }: { store: Store }) {
  const built = regions.filter(r => r.built);
  const rows = built.map(r => ({ region: r, p: regionProgress(r, store.attempts, store.sessions) }));
  const freed = rows.filter(row => row.p.freed).length;
  const rounds = store.sessions.filter(s => String(s.mode).startsWith('satz-')).sort((a, b) => b.at - a.at).slice(0, 8);
  const name = (id: string) => regions.find(r => r.id === id)?.name || id;
  const fog = regions.length - built.length;
  return <div className="admin-stack">
    <section className="panel admin-panel">
      <div className="admin-row"><h2>Königreich Satzland</h2><span className="muted"><strong>{freed}</strong> von {built.length} Gebieten befreit</span></div>
      <p className="small muted">Ein Gebiet ist befreit, wenn das Grenzfest mit mindestens einem Stern geschafft ist. Jeder Schritt öffnet sich, sobald im vorigen die Hälfte der Sätze ohne Hilfe gelöst ist.</p>
      <div className="kingdom-table">{rows.map(({ region, p }) => <div key={region.id} className={'kingdom-row' + (p.freed ? ' freed' : p.started ? ' started' : '')}>
        <div className="kingdom-name"><span className="kingdom-mark">{p.freed ? <Flag size={16}/> : <Crown size={16}/>}</span><span><strong>{region.n}. {region.name}</strong><small>{region.rule}</small></span></div>
        <div className="kingdom-steps">{p.steps.map(mode => <span key={mode} className={'kingdom-step' + (p.done[mode] ? ' done' : p.open[mode] ? ' open' : '')}>{p.done[mode] && <Check size={12} strokeWidth={3}/>}{satzStepInfo[mode as SatzMode].label}</span>)}</div>
        <div className="kingdom-score">{p.freed ? <Stars count={p.stars} size={16}/> : <Meter value={p.share * 100} label={`${region.name}: Schritte geschafft`}/>}</div>
      </div>)}</div>
      {fog > 0 && <p className="small muted kingdom-fog"><CloudFog size={15}/>{fog} weitere Gebiete liegen noch im Nebel.</p>}
    </section>
    <section className="panel admin-panel"><h2>Zuletzt gespielt</h2>
      {!rounds.length ? <Empty>Noch keine Runde in Satzland.</Empty> : <ul className="kingdom-rounds">{rounds.map(s => <li key={s.id}>
        <span>{date(s.at)}</span><strong>{name(s.batchId)}</strong><span>{satzStepInfo[s.mode as SatzMode]?.label || s.mode}</span>
        <span>{s.mode === 'satz-fest' ? <Stars count={s.stars || 0} size={14}/> : `${s.score} %`}</span></li>)}</ul>}
    </section>
  </div>;
}

function VoicePanel({ store }: { store: Store }) {
  const s = store.settings, [, refresh] = useState(0);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => refresh(n => n + 1); speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  const voices = germanVoices(), automatic = pickVoice({ voice: '' }), current = pickVoice(s);
  const sample = `Hallo ${childName(s)}! Ich bin ${MASCOT}. Unsere Katze schläft, weil sie müde ist.`;
  const missing = !!s.voice && !voices.some(v => v.name === s.voice);
  const row = (name: string, voice: SpeechSynthesisVoice | null, label: ReactNode, note: ReactNode) => <div key={name || 'auto'} className={'voice-row ' + (s.voice === name ? 'selected' : '')}>
    <label className="check"><input type="radio" name="voice" checked={s.voice === name} onChange={() => store.setting('voice', name)}/><span><strong>{label}</strong><small className="muted">{note}</small></span></label>
    {voice && <button type="button" className="listen-button" aria-label="Probehören" onClick={() => speak(sample, { voice: voice.name, pitch: s.pitch })}><Volume2 size={17}/></button>}
  </div>;
  return <section className="panel admin-panel"><h2>Vorlesestimme</h2>
    <p className="small muted">Die Geschichte, die Regeln und jeder Satz werden vorgelesen. Die Stimmen kommen vom Browser; Microsoft Edge hat die natürlichsten (zum Beispiel Katja oder Conrad).</p>
    <div className="field"><span>Stimmlage</span><div className="segmented pitch-options">{([[.9, 'Tiefer'], [1, 'Normal'], [1.1, 'Freundlich'], [1.3, 'Hell']] as const).map(([pitch, label]) => <button key={pitch} className={s.pitch === pitch ? 'selected' : ''} onClick={() => { store.setting('pitch', pitch); speak(sample, { voice: current?.name || '', pitch }); }}>{label}</button>)}</div></div>
    {!voices.length ? <p className="small warning-text">Dieser Browser hat keine deutsche Stimme.</p> : <>
      {missing && <p className="small warning-text">Die gewählte Stimme „{s.voice}“ gibt es auf diesem Gerät nicht. Hier spricht ersatzweise {current?.name}.</p>}
      <div className="voice-list" role="radiogroup" aria-label="Stimme">
        {row('', automatic, 'Automatisch', automatic ? automatic.name : '')}
        {voices.map(v => row(v.name, v, <>{v.name.replace(/^Microsoft /, '').replace(/ Online \(Natural\)/, '').replace(/ - German \(.*\)$/, '')}{childVoice.test(v.name) && <span className="quiet-badge">Kinderstimme</span>}</>, v.lang))}
      </div></>}
  </section>;
}

function SettingsPanel({ store }: { store: Store }) {
  const s = store.settings, [stars, setStars] = useState(s.starThresholds.map(String));
  const parsed = stars.map(Number), starsValid = parsed.every((v, i) => Number.isFinite(v) && v >= 0 && v <= 100 && (!i || v < parsed[i - 1]));
  return <div className="admin-stack">
    <ParentAccount store={store}/>
    <section className="panel admin-panel"><h2>Erlebnis</h2>
      <div className="settings-grid">
        <label className="check toggle"><input type="checkbox" checked={s.sound} onChange={e => store.setting('sound', e.target.checked)}/><span><strong>Töne</strong><small>Klänge beim Üben</small></span></label>
        <label className="check toggle"><input type="checkbox" checked={s.effects} onChange={e => store.setting('effects', e.target.checked)}/><span><strong>Animationen</strong><small>Hüpfer, wehende Fahnen und Konfetti</small></span></label>
      </div></section>
    <VoicePanel store={store}/>
    <section className="panel admin-panel"><h2>Grenzfest</h2>
      <h3>Sterne</h3><p className="small muted">Beim Grenzfest zählt jede richtige Entscheidung an einer Grenze. Ohne Zeitdruck und ohne Noten.</p>
      <div className="grade-key">{stars.map((value, i) => <label key={i} className="field"><span>{'★'.repeat(3 - i)} ab</span><span className="percent-input"><input inputMode="numeric" value={value} onChange={e => setStars(list => list.map((v, j) => j === i ? e.target.value.replace(/[^\d]/g, '') : v))}/>%</span></label>)}</div>
      <div className="admin-row">{!starsValid && <span className="small warning-text">Die Grenzen müssen von drei zu einem Stern kleiner werden.</span>}<button className="button primary" disabled={!starsValid || parsed.join() === s.starThresholds.join()} onClick={() => store.setting('starThresholds', parsed)}><Check size={16}/>Speichern</button></div>
    </section>
    <section className="panel admin-panel"><h2>Daten</h2><p className="small muted">Der Lernstand wird automatisch gespeichert. Zusätzlich kannst du eine Sicherung herunterladen.</p>
      <button className="button secondary" onClick={store.exportData}><Download size={17}/>Sicherung herunterladen</button></section>
  </div>;
}
