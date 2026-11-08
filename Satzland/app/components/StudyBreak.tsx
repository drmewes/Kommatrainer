'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Coffee, Flag, Hand, RotateCcw, Timer } from 'lucide-react';
import { childName, MASCOT } from '../lib/engine.mjs';
import { playSound, speak, stopSpeaking } from '../lib/sound';
import type { Settings } from '../lib/types';
import { Mascot, Modal } from './ui';

// After thirty active minutes the training is complete. More is welcome, but Schreibi says so first.
export default function StudyBreak({ phase, remaining, settings, onStart, onSnooze, onResume, onStop }: {
  phase: string; remaining: number; settings: Settings; onStart: () => void; onSnooze: () => void; onResume: () => void; onStop: () => void;
}) {
  const name = childName(settings);
  useEffect(() => {
    if (phase !== 'reminder' && phase !== 'ready' || !settings.sound) return;
    const text = phase === 'ready' ? `Hallo ${name}! Die Pause ist vorbei. Weiter geht’s!` : `${name}, du hast schon dreißig Minuten trainiert! Damit ist dein Training für heute komplett. Möchtest du Schluss machen, eine Pause oder noch zehn Minuten?`;
    playSound(phase === 'ready' ? 'finish' : 'hint', true);
    const timer = setTimeout(() => speak(text, settings), 500);
    return () => { clearTimeout(timer); stopSpeaking(); };
    // Only announce a phase once, rather than on every countdown tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  if (phase === 'learning') return null;
  const title = phase === 'reminder' ? '30 Minuten – Training komplett!' : phase === 'break' ? 'Deine 5-Minuten-Pause läuft.' : 'Die Pause ist vorbei.';
  return <Modal title={title} onClose={phase === 'reminder' ? onSnooze : onResume}>
    <div className="study-break-content"><Mascot small celebrate={phase !== 'break'} effects={settings.effects} mood={phase === 'break' ? 'sleep' : undefined}/>
      <div className="speech-bubble">{phase === 'reminder' ? 'Dreißig Minuten am Stück – richtig stark! Mehr muss heute nicht sein. Wenn du noch Lust hast, machen wir gern weiter.' : phase === 'break' ? 'Steh auf, streck dich oder trink etwas. Ich rufe dich gleich zurück!' : 'Da bist du ja! Wir machen ganz in Ruhe weiter.'}</div>
    </div>
    {phase === 'break' && <div className="break-countdown" role="timer" aria-label="Verbleibende Pausenzeit"><Timer size={26}/><strong>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</strong><span>bis {MASCOT} dich zurückruft</span></div>}
    {phase === 'break' && <p className="break-explanation">{settings.sound ? `Lass die App offen, damit du ${MASCOT} hörst.` : `Die Töne sind aus. ${MASCOT} zeigt dir hier, wenn die Pause vorbei ist.`}</p>}
    {phase === 'reminder' && <p className="break-explanation">Deine Runde wartet auf dich, egal wie du dich entscheidest.</p>}
    <div className="break-actions">{phase === 'reminder' ? <><button className="button primary big" autoFocus onClick={onStop}><Flag size={20}/>Für heute Schluss</button><button className="button secondary" onClick={onStart}><Coffee size={18}/>Pause, dann weiter</button><button className="text-button" onClick={onSnooze}>Noch 10 Minuten</button></> : phase === 'break' ? <button className="text-button" autoFocus onClick={onResume}>Pause früher beenden</button> : <button className="button primary big" autoFocus onClick={onResume}>Weiter mit {MASCOT}<ArrowRight size={19}/></button>}</div>
  </Modal>;
}

// Learning time since the last break as a small ring: the minutes, and how far it is to a complete training.
function StudyRing({ elapsedMs, remindAtMs }: { elapsedMs: number; remindAtMs: number }) {
  const progress = Math.min(1, elapsedMs / Math.max(1, remindAtMs));
  return <svg className="study-ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="8" pathLength="100" strokeDasharray={`${progress * 100} 100`}/></svg>;
}

function studyHint(elapsedMs: number, remindAtMs: number) {
  const minutes = Math.floor(elapsedMs / 60000), goal = Math.round(remindAtMs / 60000);
  return `${minutes} Minuten Training seit der letzten Pause. Nach ${goal} Minuten ist dein Training komplett. Die Uhr läuft nur beim Üben.`;
}

// Bottom right on bigger screens: training time since the last break and a quiet reset. On phones the kid keyboard
// owns the bottom of the screen, so a small chip in the header shows the minutes and opens the reset on tap.
export function StudyDock({ elapsedMs, remindAtMs, counting, onReset }: { elapsedMs: number; remindAtMs: number; counting: boolean; onReset: () => void }) {
  const minutes = Math.floor(elapsedMs / 60000), goal = Math.round(remindAtMs / 60000);
  return <div className={'study-dock' + (counting ? ' counting' : '')}>
    <div className="study-timer" title={studyHint(elapsedMs, remindAtMs)}>
      <StudyRing elapsedMs={elapsedMs} remindAtMs={remindAtMs}/><span className="study-minutes" aria-hidden="true">{minutes} / {goal} Min.</span><span className="sr-only">{minutes} Minuten Training seit der letzten Pause</span>
      <button type="button" className="study-reset" aria-label="Trainingszeit auf 0 setzen" title="Trainingszeit auf 0 setzen" disabled={elapsedMs < 1000} onClick={onReset}><RotateCcw size={14} aria-hidden="true"/></button>
    </div>
  </div>;
}

export function HeaderStudyTimer({ elapsedMs, remindAtMs, counting, onReset }: { elapsedMs: number; remindAtMs: number; counting: boolean; onReset: () => void }) {
  const [open, setOpen] = useState(false), minutes = Math.floor(elapsedMs / 60000);
  return <>
    <button type="button" className={'header-study-timer' + (counting ? ' counting' : '')} aria-label={`${minutes} Minuten Training – Trainingszeit anzeigen`} aria-haspopup="dialog" onClick={() => setOpen(true)}><StudyRing elapsedMs={elapsedMs} remindAtMs={remindAtMs}/><span aria-hidden="true">{minutes}′</span></button>
    {open && <Modal title="Deine Trainingszeit" onClose={() => setOpen(false)}>
      <p className="break-explanation">{studyHint(elapsedMs, remindAtMs)}</p>
      <div className="break-actions"><button className="button primary" autoFocus onClick={() => setOpen(false)}>Weiter trainieren</button>{elapsedMs >= 1000 && <button type="button" className="text-button" onClick={() => { onReset(); setOpen(false); }}><RotateCcw size={16} aria-hidden="true"/>Trainingszeit auf 0 setzen</button>}</div>
    </Modal>}
  </>;
}

// After a quiet minute Schreibi asks whether Lotta is still there; after two Schreibi dozes off.
export function IdleCheck({ state, settings, onWake }: { state: 'awake' | 'asking' | 'napping'; settings: Settings; onWake: () => void }) {
  const name = childName(settings), napping = state === 'napping';
  useEffect(() => {
    if (!settings.sound) return;
    const timer = setTimeout(() => speak(napping ? 'Na gut … dann ruhe ich meine Mine ein bisschen aus.' : `${name}, bist du noch da?`, settings), 300);
    return () => { clearTimeout(timer); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [napping]);
  return <Modal title={napping ? `${MASCOT} macht ein Nickerchen` : 'Bist du noch da?'} onClose={onWake}>
    <div className={'study-break-content idle-check ' + state + (settings.effects ? ' animated' : '')}>
      <div className="idle-mascot"><Mascot small effects={false} mood={napping ? 'sleep' : 'think'}/>{napping && <span className="snore" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>}</div>
      <div className="speech-bubble">{napping ? 'Na gut … dann ruhe ich meine Mine ein bisschen aus.' : `Hallo ${name}? Bist du noch da?`}</div>
    </div>
    <p className="break-explanation">{napping ? 'Die Lernzeit ist angehalten. Tipp irgendwo hin, dann geht es weiter.' : 'Ohne Tippen zählt die Lernzeit gerade nicht weiter.'}</p>
    <div className="break-actions"><button className="button primary big" autoFocus onClick={onWake}><Hand size={20}/>{napping ? `${MASCOT} aufwecken` : 'Ja, ich bin da!'}</button></div>
  </Modal>;
}
