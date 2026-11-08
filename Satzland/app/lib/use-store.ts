'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_NAME, materialize, uid } from './engine.mjs';
import { packageState } from './curriculum.mjs';
import { activeLesson, learningDay } from './learning.mjs';
import type { LearningState, Lesson, RecordEntry, Settings, Store } from './types';

// Cloudflare Access answers an expired session with a redirect to its login page instead of a 401.
const signedOut = (response: Response) => response.type === 'opaqueredirect' || response.status === 401;
// Each sync asks only for rows changed since the server time of the previous one. The overlap covers
// answers that were still being saved during that request; rows are merged by id, so repeats are harmless.
const OVERLAP = 60000;

export function useLearningStore(owner: string): Store {
  const [records, setRecords] = useState<RecordEntry[]>([]), [loaded, setLoaded] = useState(false);
  const [syncStatus, setStatus] = useState('loading'), [pendingCount, setPendingCount] = useState(0);
  const [lessonStatus, setLessonStatus] = useState<'loading' | 'ready' | 'offline'>('loading');
  const storageOk = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const recordsRef = useRef<RecordEntry[]>([]), queue = useRef<RecordEntry[]>([]), busy = useRef(false), cursor = useRef(0);
  const refreshRef = useRef<() => void>(() => {}), key = 'schreibi-v1:' + owner;
  function persist() {
    try { localStorage.setItem(key, JSON.stringify({ records: recordsRef.current, pending: queue.current, cursor: cursor.current })); storageOk.current = true; }
    catch { storageOk.current = false; setStatus('storage'); }
    setPendingCount(queue.current.length);
  }
  function merge(incoming: RecordEntry[]) {
    const map = new Map(recordsRef.current.map(row => [row.id, row]));
    for (const row of incoming) map.set(row.id, row);
    recordsRef.current = [...map.values()]; setRecords(recordsRef.current);
  }
  async function synchronizeNow() {
    if (busy.current || !navigator.onLine) { if (!navigator.onLine) setStatus('offline'); return; }
    busy.current = true; setStatus('syncing');
    try {
      while (queue.current.length) {
        const sent = queue.current.slice(0, 150);
        const response = await fetch('/api/records', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: sent }) });
        if (!response.ok) throw new Error(signedOut(response) ? '401' : String(response.status));
        const accepted = new Set(((await response.json()) as { accepted: (string | undefined)[] }).accepted);
        queue.current = queue.current.filter(row => !accepted.has(row.changeId)); persist();
      }
      const delta = cursor.current > 0;
      const response = await fetch('/api/records' + (delta ? '?since=' + (cursor.current - OVERLAP) : ''), { cache: 'no-store', redirect: 'manual' });
      if (!response.ok) throw new Error(signedOut(response) ? '401' : String(response.status));
      const { records: cloud, now } = (await response.json()) as { records: RecordEntry[]; now?: number };
      // A full download is the server's complete state; a delta only adds to what this device already has.
      const map = new Map<string, RecordEntry>(delta ? recordsRef.current.map(row => [row.id, row]) : []);
      for (const row of cloud) map.set(row.id, row);
      for (const pending of queue.current) map.set(pending.id, pending);
      cursor.current = now || 0;
      recordsRef.current = [...map.values()]; setRecords(recordsRef.current); persist(); setStatus(!storageOk.current ? 'storage' : queue.current.length ? 'syncing' : 'saved');
    } catch (error) { setStatus(String(error).includes('401') ? 'signin' : 'offline'); }
    finally { busy.current = false; setLoaded(true); }
  }
  function synchronize() {
    if (inFlight.current) return inFlight.current;
    const task = synchronizeNow(); inFlight.current = task;
    void task.finally(() => { if (inFlight.current === task) inFlight.current = null; });
    return task;
  }
  refreshRef.current = synchronize;
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); recordsRef.current = saved.records || []; queue.current = saved.pending || []; cursor.current = Number(saved.cursor) || 0; setRecords(recordsRef.current); setPendingCount(queue.current.length); }
    catch { storageOk.current = false; setStatus('storage'); }
    setLoaded(true); void synchronize();
    const sync = () => refreshRef.current(), visibility = () => { if (!document.hidden) sync(); };
    window.addEventListener('online', sync); document.addEventListener('visibilitychange', visibility);
    // A hidden tab does not poll; returning to it syncs right away.
    const timer = setInterval(() => { if (!document.hidden) sync(); }, 30000);
    return () => { clearInterval(timer); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', visibility); };
  }, [key]);
  function commit(entries: RecordEntry[]) {
    const changed = entries.map(row => ({ ...row, changeId: uid() }));
    for (const row of changed) {
      if (['setting', 'batch'].includes(row.kind)) queue.current = queue.current.filter(item => item.id !== row.id);
      queue.current.push(row);
    }
    merge(changed); persist(); void synchronize();
  }
  const state = useMemo(() => packageState(materialize(records, [])) as LearningState, [records]);
  const stateRef = useRef(state); stateRef.current = state;
  async function planLesson(workAhead = false, batchId = '') {
    setLessonStatus('loading');
    try {
      // Persist changed limits and pending introductions before the server reserves a portion.
      if (queue.current.length || busy.current) await synchronize();
      if (queue.current.length) throw new Error('Pending progress must sync before changing today’s selection');
      const response = await fetch('/api/lesson', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId: batchId || stateRef.current.settings.activeBatchId, ...(workAhead ? { workAhead: true } : {}) }) });
      if (!response.ok) throw new Error(String(response.status));
      const { lesson } = await response.json() as { lesson: Lesson }; merge([{ id: lesson.id, kind: 'lesson', data: lesson }]); persist(); setLessonStatus('ready'); return true;
    } catch { setLessonStatus('offline'); return false; }
  }
  const today = learningDay();
  useEffect(() => {
    if (!loaded || syncStatus !== 'saved' || pendingCount > 0) return;
    const batch = state.batches.find(b => b.id === state.settings.activeBatchId);
    const lesson = batch && activeLesson(state.lessons, batch, state.attempts, state.introductions);
    const started = lesson && state.introductions.some(a => lesson.wordIds.includes(a.wordId));
    if (lesson && (started || lesson.batchId === batch?.id && lesson.limit === state.settings.dailyNewLimit)) { setLessonStatus('ready'); return; }
    void planLesson();
  }, [loaded, syncStatus, today, state.lessons.length, state.attempts.length, state.introductions.length, state.settings.activeBatchId, state.settings.dailyNewLimit]);
  return { ...state, loaded, syncStatus, pending: pendingCount, lessonStatus, planLesson, commit, setting: (name: keyof Settings, value: any) => commit([{ id: 'setting:' + name, kind: 'setting', data: { key: name, value } }]), refresh: () => refreshRef.current(), exportData: () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: recordsRef.current, ...state }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = APP_NAME.toLowerCase().replace(/\s+/g, '-') + '-sicherung.json'; link.click(); URL.revokeObjectURL(link.href);
  } };
}
