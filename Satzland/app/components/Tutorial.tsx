'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Volume2, VolumeX, X } from 'lucide-react';
import { childName, MASCOT } from '../lib/engine.mjs';
import { speakSequence, stopSpeaking } from '../lib/sound';
import type { Store } from '../lib/types';
import { Mascot } from './ui';

export type TutorialPage = 'home' | 'stats' | 'settings';
type Audience = 'welcome' | 'child' | 'parent';
type Step = { title: string; text: string; target: string; page: TutorialPage };
type Spot = { top: number; left: number; width: number; height: number };

function steps(audience: Audience, store: Store): Step[] {
  const name = childName(store.settings);
  if (audience === 'child') return [
    { title: 'Das Königreich Satzland', text: `Hallo ${name}! In Satzland regiert in jedem Satz ein König: das Verb. Kleckser hat die goldenen Grenzposten geklaut – die Kommas. Jede Fahne auf der Mauer ist ein Gebiet, das du befreien kannst.`, target: '[data-tour="kingdom"]', page: 'home' },
    { title: 'Dein Gebiet', text: 'Hier wählst du das Gebiet. Jedes Gebiet hat eine eigene Komma-Regel. Daneben steht, um welche Regel es geht.', target: '[data-tour="region"]', page: 'home' },
    { title: 'Los geht’s', text: 'Die Prinzessin sagt dir, was als Nächstes dran ist. Ein Tipp auf den roten Knopf, und du bist mitten im Gebiet.', target: '[data-tour="mission"]', page: 'home' },
    { title: 'Dein Weg durch das Gebiet', text: 'Erst lernst du das Gebiet kennen, dann findest du Könige, gehst den Grenzweg, setzt Grenzposten und wirst Textdetektiv. Beim Grenzfest befreist du das Gebiet.', target: '[data-tour="satz-path"]', page: 'home' },
    { title: 'Dein Weg durch Satzland', text: `Hier siehst du alle Gebiete und wie weit du überall bist. Ganz in Ruhe – Gründlichkeit schlägt Tempo. Viel Spaß, ${name}!`, target: '[data-tour="satz-progress"]', page: 'home' },
  ];
  if (audience === 'parent') return [
    { title: 'Kommas mit Königen und Königreichen', text: 'Der Kommatrainer folgt der Methode „Könige und Königreiche“: Das Verb ist der König, zu jedem König gehört ein Königreich, und wo zwei Königreiche aneinanderstoßen, steht ein Grenzposten – das Komma. Die Gebiete folgen dem Kernlehrplan NRW für Klasse 5 und 6: Aufzählungen, Haupt- und Nebensätze, Torwörter, gemischte Texte.', target: '[data-tour="kingdom"]', page: 'home' },
    { title: 'Lernstand', text: 'Hier siehst du für jedes Gebiet, welche Schritte geschafft sind und wie viele Sterne das Grenzfest gebracht hat, dazu die zuletzt gespielten Runden.', target: '[data-tour="parent-stats"]', page: 'stats' },
    { title: 'Einstellungen', text: 'Name des Kindes, Eltern-PIN, Vorlesestimme, Töne und Animationen und die Sternegrenzen des Grenzfests. Nach 30 Minuten schlägt die App eine Pause vor.', target: '[data-tour="parent-settings"]', page: 'settings' },
  ];
  return [];
}

export default function Tutorial({ store, onPageChange, onClose }: { store: Store; onPageChange: (page: TutorialPage | null) => void; onClose: () => void }) {
  const [audience, setAudience] = useState<Audience>('welcome'), [index, setIndex] = useState(0), [spot, setSpot] = useState<Spot | null>(null);
  const [narration, setNarration] = useState(store.settings.sound);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = steps(audience, store), step = list[index];
  const welcome = `Hallo! Ich bin ${MASCOT}, dein Stift. Ich kann schreiben – aber die Regeln knacken wir zusammen. Ich zeige dir, wie hier alles geht. Möchtest du die Tour für Kinder oder für Eltern?`;
  const text = audience === 'welcome' ? welcome : step ? step.title + '. ' + step.text : '';
  useEffect(() => { dialog.current?.showModal(); return () => { stopSpeaking(); dialog.current?.close(); }; }, []);
  useEffect(() => { onPageChange(audience === 'welcome' ? null : step?.page || null); }, [audience, step?.page, onPageChange]);
  useEffect(() => {
    if (!narration || !text) { stopSpeaking(); return; }
    const timer = setTimeout(() => speakSequence(text.match(/[^.!?]+[.!?]*\s*/g)?.map(part => ({ text: part, rate: .9 })) || [{ text }], store.settings), 250);
    return () => { clearTimeout(timer); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, narration]);
  useLayoutEffect(() => {
    if (!step) { setSpot(null); return; }
    let frame = 0;
    const measure = () => {
      // The tour shows a preview copy of the page; the real one is hidden behind it.
      const visible = (selector: string) => [...document.querySelectorAll(selector)].find(el => el.getClientRects().length > 0);
      const target = visible('[data-tour-preview] ' + step.target) || visible(step.target);
      if (!target) { setSpot(null); return; }
      const r = target.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight - 40) target.scrollIntoView({ block: 'center' });
      const box = target.getBoundingClientRect();
      setSpot({ top: box.top - 8, left: box.left - 8, width: box.width + 16, height: box.height + 16 });
    };
    frame = requestAnimationFrame(() => requestAnimationFrame(measure));
    addEventListener('resize', measure);
    return () => { cancelAnimationFrame(frame); removeEventListener('resize', measure); };
  }, [step]);
  function close() { if (!store.settings.tutorialWelcomeSeen) store.setting('tutorialWelcomeSeen', true); stopSpeaking(); onPageChange(null); onClose(); }
  function finish() {
    store.setting(audience === 'parent' ? 'parentTutorialDone' : 'childTutorialDone', true);
    close();
  }
  // Below the highlighted area if there is room, above otherwise; a large area gets the card docked at the bottom.
  const place = !spot ? 'center' : innerHeight - spot.top - spot.height > 330 ? 'below' : spot.top > 330 ? 'above' : 'docked';
  return <dialog ref={dialog} className="tour" onCancel={e => { e.preventDefault(); close(); }}>
    {spot && <div className="tour-spot" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}/>}
    {!spot && <div className="tour-dim"/>}
    <div className={'tour-card ' + place} style={place === 'below' ? { top: spot!.top + spot!.height + 14 } : place === 'above' ? { bottom: innerHeight - spot!.top + 14 } : place === 'docked' ? { bottom: 16 } : undefined}>
      <div className="tour-head"><Mascot small effects={store.settings.effects}/><div><span className="eyebrow">{audience === 'welcome' ? 'Willkommen' : `${audience === 'child' ? 'Kinder-Tour' : 'Eltern-Tour'} · ${index + 1}/${list.length}`}</span><h2>{audience === 'welcome' ? `Hallo, ich bin ${MASCOT}!` : step.title}</h2></div>
        <button type="button" className="icon-button" aria-label={narration ? 'Vorlesen aus' : 'Vorlesen an'} onClick={() => setNarration(n => !n)}>{narration ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button>
        <button type="button" className="icon-button" aria-label="Tour schließen" onClick={close}><X size={20}/></button></div>
      <p>{audience === 'welcome' ? welcome : step.text}</p>
      {audience === 'welcome' ? <div className="tour-actions"><button className="button primary big" autoFocus onClick={() => { setIndex(0); setAudience('child'); }}>Tour für Kinder</button><button className="button secondary" onClick={() => { setIndex(0); setAudience('parent'); }}>Tour für Eltern</button><button className="text-button" onClick={close}>Später</button></div>
        : <div className="tour-actions"><button className="button secondary" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft size={18}/>Zurück</button>{index + 1 < list.length ? <button className="button primary" autoFocus onClick={() => setIndex(i => i + 1)}>Weiter<ArrowRight size={18}/></button> : <button className="button primary" autoFocus onClick={finish}><Check size={18}/>Fertig</button>}</div>}
    </div>
  </dialog>;
}
