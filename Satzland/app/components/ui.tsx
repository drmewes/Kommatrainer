'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Star, Volume2, X } from 'lucide-react';
import { highlightDiff, knacks, vowelInfo } from '../lib/words.mjs';
import { dictate, speak, type VoicePrefs } from '../lib/sound';
import type { Word } from '../lib/types';
import { SchreibiSvg, type Mood } from './Schreibi';

export const date = (at: number | null, time = false) => at ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', ...(time ? { timeStyle: 'short' as const } : {}), timeZone: 'Europe/Berlin' }).format(at) : 'Datum unbekannt';
export const shortDate = (day?: string) => day ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z')) : '';
export const plural = (n: number, one: string, many: string) => n === 1 ? one : many;

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className={'modal ' + (wide ? 'wide' : '')} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Schließen" onClick={onClose}><X size={21}/></button></div>{children}
  </dialog>;
}

export function Mascot({ small = false, celebrate = false, effects = true, mood }: { small?: boolean; celebrate?: boolean; effects?: boolean; mood?: Mood }) {
  return <div className={'mascot ' + (small ? 'small ' : '') + (celebrate && effects ? 'celebrate ' : '') + (effects ? 'alive' : '')}><SchreibiSvg mood={mood || (celebrate ? 'cheer' : 'happy')}/></div>;
}

// The word as in class: syllables in alternating colours with arcs, the Knackstelle marked like a highlighter.
// With `vowel` the stressed syllable is bold and its vowel gets the school mark: a dot for short, a line for long.
export function SyllableWord({ word, mark = '', arcs = true, vowel = false, className = '' }: { word: Word; mark?: string; arcs?: boolean; vowel?: boolean; className?: string }) {
  const spot = mark ? knacks(word).find(k => k.key === mark) : null, v = vowel ? vowelInfo(word) : null;
  const starts = word.syllables.map((_, i) => word.syllables.slice(0, i).join('').length);
  return <span className={'syllable-word ' + className} lang="de" aria-label={word.text}>{word.syllables.map((syllable, i) => {
    const start = starts[i];
    const letters = [...syllable].map((ch, j) => {
      const at = start + j, inside = spot && at >= spot.start && at < spot.end, nucleus = v && at >= v.from && at < v.to;
      return <span key={j} className={[inside ? 'knack-letter' : '', nucleus ? 'vowel-' + v.length + (at === v.from ? ' vowel-first' : '') + (at === v.to - 1 ? ' vowel-last' : '') : ''].join(' ').trim() || undefined}>{ch}</span>;
    });
    return <span key={i} className={'syl ' + (i % 2 ? 'syl-b' : 'syl-a') + (arcs ? ' arc' : '') + (v?.index === i ? ' stressed' : '')} aria-hidden="true">{letters}</span>;
  })}</span>;
}

// Bausteine as coloured chips: prefixes, the stem and endings.
const affix = /^(ver|vor|ent|end|zer|be|ge|er|un|ab|an|auf|aus|mit|nach|über|unter|zu|ung|heit|keit|nis|schaft|lich|isch|ig|er|en|el|eln|n|t|st|e|s|in|ling|bar|sam|chen)$/i;
export function Bausteine({ word, highlight = '' }: { word: Word; highlight?: string }) {
  const parts = word.parts?.length ? word.parts : [word.text];
  return <span className="bausteine" lang="de">{parts.map((part, i) => <span key={i} className={'baustein ' + (affix.test(part) ? i === 0 && parts.length > 1 ? 'prefix' : 'ending' : 'stem') + (highlight && part.toLowerCase() === highlight.toLowerCase() ? ' found' : '')}>{part}</span>)}</span>;
}

// Points are collected from the first day and kept for the game that comes later.
export function PointsPill({ amount, label = 'Punkte' }: { amount: number; label?: string }) {
  return <span className="points" aria-label={amount + ' ' + label}><Star size={16} fill="currentColor"/><strong>{amount}</strong><span>{label}</span></span>;
}

export function WordPicture({ word, size = 'large' }: { word: Pick<Word, 'emoji' | 'article'>; size?: 'large' | 'small' }) {
  return word.emoji ? <span className={'word-picture ' + size} aria-hidden="true">{word.emoji}</span> : <span className={'word-picture none ' + size} aria-hidden="true">📝</span>;
}

// The dictation sentence with the target word replaced by a line.
export function SentenceGap({ word, reveal = false }: { word: Word; reveal?: boolean }) {
  if (!word.sentence) return null;
  const parts = word.sentence.split(/(\{[^}]+\})/);
  return <p className="sentence-gap" lang="de">{parts.map((part, i) => part.startsWith('{') ? reveal ? <mark key={i}>{part.slice(1, -1)}</mark> : <span key={i} className="sentence-blank" aria-label="Lücke">{' '.repeat(Math.max(4, part.length - 2))}</span> : <span key={i}>{part}</span>)}</p>;
}

export function ListenButton({ word, prefs, label = 'Nochmal hören', withSentence = true }: { word: Word; prefs: VoicePrefs; label?: string; withSentence?: boolean }) {
  return <button type="button" className="listen-button" onClick={() => dictate(word, prefs, withSentence)}><Volume2 size={20}/><span>{label}</span></button>;
}

export function SpeakText({ text, prefs, label = 'Vorlesen' }: { text: string; prefs: VoicePrefs; label?: string }) {
  return <button type="button" className="speak-text" aria-label={label + ': ' + text} onClick={() => speak(text, prefs)}><Volume2 size={16}/></button>;
}

export function Diff({ input, expected }: { input: string; expected: string }) {
  if (!input.trim()) return <span className="muted">—</span>;
  return <span className="spelling-diff" lang="de">{highlightDiff(input, expected).map((part: { value: string; kind: string }, index: number) => <span key={index} className={part.kind} aria-label={part.kind === 'missing' ? ' fehlt: ' + part.value : undefined}>{part.kind === 'missing' ? '•' : part.value}</span>)}</span>;
}

export function Empty({ children }: { children: ReactNode }) { return <div className="empty-state">{children}</div>; }
export function Meter({ value, label }: { value: number; label: string }) { return <div className="meter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><span style={{ width: Math.min(100, Math.max(0, value)) + '%' }}/></div>; }
export function Confetti({ show }: { show: boolean }) {
  return show ? <div className="confetti" aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ left: (i * 31 % 100) + '%', animationDelay: i % 7 * .07 + 's', background: ['#f59ab1', '#ffc93d', '#58b38a', '#5b8def', '#a98bf0'][i % 5], transform: 'rotate(' + i * 23 + 'deg)' }}/>)}</div> : null;
}
export function Stars({ count, size = 28 }: { count: number; size?: number }) {
  return <span className="stars" aria-label={count + ' von 3 Sternen'}>{[0, 1, 2].map(i => <svg key={i} className={i < count ? 'on' : 'off'} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.6 2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7Z" strokeLinejoin="round"/></svg>)}</span>;
}
