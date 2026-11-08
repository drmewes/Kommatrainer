'use client';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, KeyRound, LockKeyhole, LogOut } from 'lucide-react';
import { childName, defaults } from '../lib/engine.mjs';
import { pinFormat, requestPin, type ParentPin, type PinResult } from '../lib/use-parent-pin';
import type { Store } from '../lib/types';
import { Mascot } from './ui';

const NAME_MAX = 30;
const nameHint = () => 'Vorname oder Spitzname reicht.';

export function pinError(result: PinResult) {
  if (result.ok) return '';
  if (result.reason === 'locked') {
    const wait = result.retryAfter || 30, minutes = Math.ceil(wait / 60);
    return wait > 90 ? `Zu viele Versuche. Bitte in ${minutes} Minuten noch einmal probieren.` : `Zu viele Versuche. Bitte in ${wait} Sekunden noch einmal probieren.`;
  }
  return result.reason === 'wrong' ? 'Diese PIN stimmt nicht.'
    : result.reason === 'invalid' ? 'Die PIN braucht 4 bis 6 Ziffern.'
    : result.reason === 'signin' ? 'Die Anmeldung ist abgelaufen. Bitte die Seite neu laden.'
    : result.reason === 'unset' ? 'Es ist noch keine PIN festgelegt.'
    : 'Für den Elternbereich ist eine Internetverbindung nötig.';
}

function PinInput({ label, value, onChange, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
  return <label className="field"><span>{label}</span><input className="pin-input" type="password" inputMode="numeric" autoComplete="off" maxLength={6} autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}/></label>;
}

// New PIN plus repetition, shared by the first setup, the master reset and the settings.
function NewPin({ pin, repeat, onPin, onRepeat }: { pin: string; repeat: string; onPin: (v: string) => void; onRepeat: (v: string) => void }) {
  return <>
    <PinInput label={'Neue Eltern-PIN (4–6 Ziffern)'} value={pin} onChange={onPin}/>
    <PinInput label={'PIN wiederholen'} value={repeat} onChange={onRepeat}/>
    {repeat.length >= pin.length && pin && repeat !== pin && <p className="small warning-text">{'Die beiden PINs sind nicht gleich.'}</p>}
  </>;
}
const newPinReady = (pin: string, repeat: string) => pinFormat.test(pin) && pin === repeat;

export function ParentSetup({ store, pin }: { store: Store; pin: ParentPin }) {
  const [name, setName] = useState(childName(store.settings)), [code, setCode] = useState(''), [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const ready = !!name.trim() && newPinReady(code, repeat) && !busy;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true); setError('');
    const result = await pin.set(code);
    setBusy(false);
    if (result.ok) store.setting('childName', name.trim());
    else setError(result.reason === 'wrong' ? 'Auf einem anderen Gerät wurde gerade schon eine PIN festgelegt.' : pinError(result));
  }
  return <section className="panel parent-lock">
    <Mascot small effects={store.settings.effects}/>
    <span className="eyebrow">{'Willkommen'}</span>
    <h1>{'Kurz einrichten'}</h1>
    <p className="muted">{'Zwei Angaben für die Eltern, dann kann es losgehen. Beides lässt sich später unter „Für die Eltern“ → Einstellungen ändern.'}</p>
    <form onSubmit={submit}>
      <label className="field"><span>{'Name des Kindes'}</span><input value={name} maxLength={NAME_MAX} autoComplete="off" placeholder={defaults.childName} onChange={e => setName(e.target.value)}/><small className="muted">{nameHint()}</small></label>
      <NewPin pin={code} repeat={repeat} onPin={setCode} onRepeat={setRepeat}/>
      <p className="small muted">{'Die PIN öffnet den Elternbereich mit Lernstand, Wortlisten und Einstellungen. Am besten eine PIN wählen, die das Kind nicht kennt.'}</p>
      {error && <p className="small warning-text" role="alert">{error}</p>}
      <button className="button primary" disabled={!ready}><Check size={18}/>{'Speichern und loslegen'}</button>
    </form>
  </section>;
}

export function ParentGate({ store, pin, onUnlock, onCancel }: { store: Store; pin: ParentPin; onUnlock: () => void; onCancel: () => void }) {
  const [code, setCode] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [master, setMaster] = useState(''), [next, setNext] = useState(''), [repeat, setRepeat] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code || busy) return;
    setBusy(true); setError('');
    const result = await pin.verify(code);
    setBusy(false); setCode('');
    if (!result.ok) setError(pinError(result));
    else if (result.master) setMaster(code);
    else onUnlock();
  }
  async function reset(event: FormEvent) {
    event.preventDefault();
    if (!newPinReady(next, repeat) || busy) return;
    setBusy(true); setError('');
    const result = await pin.set(next, master);
    setBusy(false);
    if (result.ok) onUnlock(); else setError(pinError(result));
  }
  if (master) return <section className="panel parent-lock">
    <KeyRound className="parent-lock-icon" size={34}/>
    <span className="eyebrow">{'Master-PIN erkannt'}</span>
    <h1>{'Neue PIN festlegen'}</h1>
    <p className="muted">{'Die bisherige PIN wird ersetzt.'}</p>
    <form onSubmit={reset}>
      <NewPin pin={next} repeat={repeat} onPin={setNext} onRepeat={setRepeat}/>
      {error && <p className="small warning-text" role="alert">{error}</p>}
      <button className="button primary" disabled={!newPinReady(next, repeat) || busy}><Check size={18}/>{'PIN speichern'}</button>
      <button type="button" className="text-button" onClick={onUnlock}>{'Später – jetzt nur öffnen'}</button>
    </form>
  </section>;
  return <section className="panel parent-lock">
    <LockKeyhole className="parent-lock-icon" size={34}/>
    <span className="eyebrow">{'Elternbereich'}</span>
    <h1>{'Bitte Eltern-PIN eingeben'}</h1>
    <form onSubmit={submit}>
      <PinInput label={'Eltern-PIN'} value={code} onChange={setCode} autoFocus/>
      {error && <p className="small warning-text" role="alert">{error}</p>}
      <button className="button primary" disabled={!code || busy}><LockKeyhole size={18}/>{'Öffnen'}</button>
    </form>
    <p className="small muted">{'PIN vergessen? Mit der Master-PIN öffnen und danach eine neue PIN festlegen.'}</p>
    <button type="button" className="text-button" onClick={onCancel}><ArrowLeft size={17}/>{'Zurück zum Lernen'}</button>
  </section>;
}

export function ParentAccount({ store }: { store: Store }) {
  const s = store.settings;
  const [name, setName] = useState(childName(s)), [current, setCurrent] = useState(''), [next, setNext] = useState(''), [repeat, setRepeat] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null), [busy, setBusy] = useState(false);
  async function changePin(event: FormEvent) {
    event.preventDefault();
    if (!current || !newPinReady(next, repeat) || busy) return;
    setBusy(true); setMessage(null);
    const result = await requestPin({ action: 'set', pin: next, current });
    setBusy(false);
    if (result.ok) { setCurrent(''); setNext(''); setRepeat(''); }
    setMessage(result.ok ? { text: 'Die neue PIN gilt ab sofort.', ok: true } : { text: pinError(result), ok: false });
  }
  return <section className="panel admin-panel"><h2>{'Kind & Elternbereich'}</h2>
    <div className="settings-grid">
      <label className="field"><span>{'Name des Kindes'}</span><input value={name} maxLength={NAME_MAX} autoComplete="off" placeholder={defaults.childName} onChange={e => setName(e.target.value)}/><small className="muted">{nameHint()}</small></label>
    </div>
    <div className="admin-row"><span className="small muted">{'So spricht die App dein Kind an.'}</span><button className="button primary" disabled={!name.trim() || name.trim() === s.childName} onClick={() => { setName(name.trim()); store.setting('childName', name.trim()); }}><Check size={16}/>{'Name speichern'}</button></div>
    <h3>{'Eltern-PIN ändern'}</h3>
    <form onSubmit={changePin}>
      <div className="settings-grid">
        <PinInput label={'Aktuelle PIN'} value={current} onChange={setCurrent}/>
        <NewPin pin={next} repeat={repeat} onPin={setNext} onRepeat={setRepeat}/>
      </div>
      <div className="admin-row">{message ? <span className={'small ' + (message.ok ? 'muted' : 'warning-text')} role="status">{message.text}</span> : <span className="small muted">{'Aktuelle PIN vergessen? Die Master-PIN funktioniert hier auch.'}</span>}<button className="button secondary" disabled={!current || !newPinReady(next, repeat) || busy}><KeyRound size={16}/>{'PIN ändern'}</button></div>
    </form>
    {import.meta.env.PROD && <><h3>{'Anmeldung'}</h3><div className="admin-row"><span className="small muted">{'Abmelden ist nur auf fremden oder geteilten Geräten nötig.'}</span><a className="button secondary" href="/cdn-cgi/access/logout"><LogOut size={16}/>{'Abmelden'}</a></div></>}
  </section>;
}
