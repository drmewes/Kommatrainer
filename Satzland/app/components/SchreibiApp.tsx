'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, Cloud, CloudOff, Crown, House, Settings2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { APP_NAME, HOME_EVENT, MASCOT } from '../lib/engine.mjs';
import { useLearningStore } from '../lib/use-store';
import { useStudyBreak } from '../lib/use-study-break';
import { useParentPin } from '../lib/use-parent-pin';
import Admin from './Admin';
import Satzland, { SatzPanel, type SatzStart } from './Satzland';
import StudyBreak, { HeaderStudyTimer, IdleCheck, StudyDock } from './StudyBreak';
import Tutorial, { type TutorialPage } from './Tutorial';
import { ParentGate, ParentSetup } from './ParentLock';
import { SchreibiFace } from './Schreibi';

export default function SchreibiApp({ owner }: { owner: string }) {
  const store = useLearningStore(owner), settings = store.settings;
  const [view, setView] = useState('home');
  const [tutorialOpen, setTutorialOpen] = useState(false), [tutorialPage, setTutorialPage] = useState<TutorialPage | null>(null);
  // The parent area unlocks per visit; leaving it locks it again.
  const pin = useParentPin(), [unlocked, setUnlocked] = useState(false);
  const needsSetup = store.loaded && pin.status === 'unset';
  const studyBreak = useStudyBreak(owner, !tutorialOpen && view === 'satzland', tutorialOpen || view === 'admin', store.loaded);
  const idle = studyBreak.phase === 'learning' && studyBreak.idle !== 'awake';
  const paused = studyBreak.phase !== 'learning' || idle, tourBlocked = paused || !store.loaded || pin.status === 'loading' || needsSetup;
  const showStudyTime = !tourBlocked && !tutorialOpen && view !== 'admin';
  const shownView = tutorialPage ? tutorialPage === 'home' ? 'home' : 'admin' : view;
  useEffect(() => { document.title = APP_NAME; }, []);
  // The welcome tour opens once on the first visit to the training place.
  useEffect(() => { if (store.loaded && !needsSetup && pin.status === 'set' && !settings.tutorialWelcomeSeen && view === 'home') setTutorialOpen(true); }, [store.loaded, needsSetup, pin.status, settings.tutorialWelcomeSeen, view]);
  const signIn = () => window.location.reload();
  // A view that must not lose work (a round, a check) cancels the event and asks first.
  const leaveFirst = (action: () => void) => { if (window.dispatchEvent(new CustomEvent(HOME_EVENT, { cancelable: true }))) action(); };
  // Satzland opens straight into the step chosen on the training place (the story first on the very first visit).
  const [satzStart, setSatzStart] = useState<SatzStart & { run: number } | null>(null);
  const go = (next: string) => { if (next !== 'admin') setUnlocked(false); setView(next); window.scrollTo({ top: 0 }); };
  const startSatz = (next: SatzStart) => { setSatzStart(prev => ({ ...next, run: (prev?.run || 0) + 1 })); go('satzland'); };
  const closeTour = useCallback(() => { setTutorialPage(null); setTutorialOpen(false); }, []);
  const noop = () => {};
  return <div className={'app ' + (shownView === 'admin' ? 'parent-view ' : '') + (shownView === 'satzland' ? 'focus-view ' : '') + (tutorialOpen ? 'tutorial-active' : '')}>
    <header className="site-header">
      {/* The same way home from every page: left of everything, labelled, and it asks before a round is lost. */}
      <button className={'home-button' + (shownView === 'home' ? ' here' : '')} data-tour="home-button" onClick={() => leaveFirst(() => go('home'))} aria-label="Zum Königreich" aria-current={shownView === 'home' ? 'page' : undefined}><House size={22}/><span>Start</span></button>
      <button className="brand" onClick={() => leaveFirst(() => go('home'))} aria-label={APP_NAME + ' – Startseite'}><span className="brand-face"><SchreibiFace/></span><span className="brand-name"><strong>{APP_NAME}</strong><small>mit {MASCOT}</small></span></button>
      <nav data-tour="navigation" aria-label="Hauptnavigation">
        <button className={shownView === 'satzland' && satzStart?.mode === 'story' ? 'active' : ''} onClick={() => leaveFirst(() => startSatz({ regionId: '', mode: 'story' }))}><Crown size={18}/><span>Geschichte</span></button>
        <button className={shownView === 'admin' ? 'active' : ''} onClick={() => leaveFirst(() => go('admin'))}><Settings2 size={18}/><span>Eltern</span></button>
      </nav>
      <div className="header-controls">{showStudyTime && <HeaderStudyTimer elapsedMs={studyBreak.elapsedMs} remindAtMs={studyBreak.remindAtMs} counting={studyBreak.counting} onReset={studyBreak.resume}/>}<button className="icon-button sound-toggle" aria-label="Ton an oder aus" aria-pressed={settings.sound} onClick={() => store.setting('sound', !settings.sound)}>{settings.sound ? <Volume2 size={21}/> : <VolumeX size={21}/>}</button><button type="button" className="tour-launch" disabled={tourBlocked} title={tourBlocked ? 'Nach dem Check oder der Pause kannst du die Tour öffnen.' : 'Einführung für Kinder und Eltern'} onClick={() => setTutorialOpen(true)}><Sparkles size={16}/><span>Tour</span></button></div>
    </header>
    <main>
      {store.loaded && ['offline', 'signin', 'storage'].includes(store.syncStatus) && <div className={'important-notice ' + (store.syncStatus === 'storage' ? 'danger' : 'warning')} role={store.syncStatus === 'offline' ? 'status' : 'alert'}>
        <div><strong>{store.syncStatus === 'storage' ? 'Auf diesem Gerät kann der Lernstand gerade nicht gespeichert werden.' : store.syncStatus === 'signin' ? 'Bitte erneut anmelden, damit der Lernstand gespeichert wird.' : 'Du bist offline. Dein Lernstand bleibt auf diesem Gerät.'}</strong><p>{store.syncStatus === 'storage' ? 'Lass die Seite geöffnet und prüfe die Verbindung.' : 'Du kannst weiterüben. Sobald die Verbindung wieder da ist, wird alles übertragen.'}</p></div>
        {store.syncStatus === 'signin' ? <button className="button secondary" onClick={signIn}>Jetzt anmelden</button> : <button className="button secondary" onClick={store.refresh}>Nochmal versuchen</button>}
      </div>}
      <div hidden={!!tutorialPage}>{!store.loaded ? <div className="loading-card">{MASCOT} spitzt sich an …</div> :
        needsSetup ? <ParentSetup store={store} pin={pin}/> :
        view === 'satzland' && satzStart ? <Satzland key={'satz' + satzStart.run} store={store} paused={paused || tutorialOpen} start={satzStart} onExit={() => go('home')}/> :
        view === 'admin' ? unlocked ? <Admin store={store} onLock={() => setUnlocked(false)}/> : <ParentGate store={store} pin={pin} onUnlock={() => setUnlocked(true)} onCancel={() => go('home')}/> :
        <SatzPanel store={store} onStart={startSatz}/>}</div>
      {tutorialPage && <div data-tour-preview="true">{tutorialPage === 'home' ? <SatzPanel store={store} onStart={noop}/> : <Admin store={unlocked ? store : { ...store, attempts: [], sessions: [], tests: [], introductions: [], milestones: [], commit: noop, setting: noop, planLesson: async () => false }} tutorialTab={tutorialPage}/>}</div>}
    </main>
    <footer className="site-footer"><span className="world-caption"><Crown size={14}/>Erst den König finden, dann die Grenze.</span>
      <button className={'sync-state ' + store.syncStatus} onClick={store.refresh}>{store.syncStatus === 'saved' ? <Check size={14}/> : store.syncStatus === 'offline' ? <CloudOff size={14}/> : <Cloud size={14}/>}
        {store.syncStatus === 'saved' ? 'Lernstand gespeichert' : store.syncStatus === 'syncing' ? 'Wird gespeichert …' : store.syncStatus === 'signin' ? 'Bitte erneut anmelden' : store.syncStatus === 'storage' ? 'Gerätespeicher nicht verfügbar' : 'Offline · auf dem Gerät gespeichert'}{store.pending > 0 && ' (' + store.pending + ')'}</button>
    </footer>
    {showStudyTime && <StudyDock elapsedMs={studyBreak.elapsedMs} remindAtMs={studyBreak.remindAtMs} counting={studyBreak.counting} onReset={studyBreak.resume}/>}
    {idle && <IdleCheck state={studyBreak.idle} settings={settings} onWake={studyBreak.wake}/>}
    <StudyBreak phase={studyBreak.phase} remaining={studyBreak.remaining} settings={settings} onStart={studyBreak.start} onSnooze={studyBreak.snooze} onResume={studyBreak.resume} onStop={() => { studyBreak.resume(); leaveFirst(() => go('home')); }}/>
    {tutorialOpen && <Tutorial store={store} onPageChange={setTutorialPage} onClose={closeTour}/>}
  </div>;
}
