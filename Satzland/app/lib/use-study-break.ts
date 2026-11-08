'use client';
import { useEffect, useRef, useState } from 'react';
import { advanceStudyClock, AWAY_RESET_MS, createStudyClock, IDLE_AFTER_MS, idlePhase, MAX_TICK_GAP_MS, restoreStudyClock, runningExamDraft, snoozeStudyBreak, startStudyBreak, STUDY_INTERVAL_MS, welcomeBack } from './study-break.mjs';

export function useStudyBreak(owner: string, learning: boolean, defer: boolean, enabled: boolean) {
  const [clock, setClock] = useState(() => createStudyClock());
  const [initializedOwner, setInitializedOwner] = useState<string | null>(null);
  const [examDraft, setExamDraft] = useState<{ batchId: string; startedAt: number } | null>(null);
  const key = 'schreibi-study-break:' + owner;
  const lastActivity = useRef(0), [idle, setIdle] = useState<'awake' | 'asking' | 'napping'>('awake');
  // Every sign of the child counts as being there. After a long absence the old learning time is gone.
  const present = (now = Date.now()) => {
    const away = now - lastActivity.current;
    lastActivity.current = now;
    if (away >= AWAY_RESET_MS) setClock(state => welcomeBack(state, now, away));
  };
  const wake = () => { present(); setIdle('awake'); };
  useEffect(() => {
    const mark = () => { present(); setIdle(state => state === 'awake' ? state : 'awake'); };
    lastActivity.current = Date.now();
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
    for (const name of events) window.addEventListener(name, mark, { passive: true, capture: true });
    return () => { for (const name of events) window.removeEventListener(name, mark, { capture: true }); };
  }, []);
  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { /* Reminders also work without storage. */ }
    // Session storage exists only in the browser, so the saved clock is restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(restoreStudyClock(saved)); setExamDraft(null); setInitializedOwner(owner);
  }, [key, owner]);
  useEffect(() => {
    if (initializedOwner !== owner || !enabled) return;
    const tick = (event?: Event) => {
      const visible = document.visibilityState === 'visible';
      const now = Date.now();
      // Coming back to the tab counts as being there again.
      if (event?.type === 'visibilitychange' && visible) present(now);
      // Only a practice round asks whether the child is still there; a test or the parent area never does.
      setIdle(learning && !defer && visible ? idlePhase(now - lastActivity.current) : 'awake');
      let draft = null;
      try { draft = runningExamDraft(localStorage, owner, now); } catch { /* Device storage is optional. */ }
      setExamDraft(previous => previous?.batchId === draft?.batchId && previous?.startedAt === draft?.startedAt ? previous : draft);
      setClock(state => advanceStudyClock(state, now, learning && visible, visible && !defer && !draft, lastActivity.current + IDLE_AFTER_MS, MAX_TICK_GAP_MS));
    };
    tick(); const timer = setInterval(() => tick(), 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [initializedOwner, owner, learning, defer, enabled]);
  useEffect(() => {
    if (initializedOwner !== owner) return;
    try { sessionStorage.setItem(key, JSON.stringify({ ...clock, presentAt: lastActivity.current })); } catch { /* The clock continues in memory. */ }
  }, [clock, initializedOwner, key, owner]);
  return {
    phase: initializedOwner === owner ? clock.phase : 'learning',
    elapsedMs: initializedOwner === owner ? clock.elapsedMs : 0,
    remindAtMs: STUDY_INTERVAL_MS,
    counting: clock.phase === 'learning' && clock.active,
    // The clock ticks every second; its last tick is the time the countdown shows.
    remaining: Math.max(0, Math.ceil((clock.breakEndsAt - clock.lastAt) / 1000)),
    runningExam: initializedOwner === owner ? examDraft : null,
    idle, wake,
    start: () => setClock(state => startStudyBreak(state)),
    snooze: () => setClock({ ...snoozeStudyBreak(), active: learning && document.visibilityState === 'visible' }),
    resume: () => setClock({ ...createStudyClock(), active: learning && document.visibilityState === 'visible' }),
  };
}
