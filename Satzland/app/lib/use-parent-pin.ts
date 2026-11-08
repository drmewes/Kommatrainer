'use client';
import { useCallback, useEffect, useState } from 'react';

export type PinStatus = 'loading' | 'set' | 'unset' | 'unknown';
export type PinResult = { ok: true; master?: boolean } | { ok: false; reason: 'wrong' | 'locked' | 'unset' | 'invalid' | 'signin' | 'offline'; retryAfter?: number };
export type ParentPin = { status: PinStatus; refresh: () => void; verify: (pin: string) => Promise<PinResult>; set: (pin: string, current?: string) => Promise<PinResult> };
export const pinFormat = /^\d{4,6}$/;

// Access answers an expired session with a redirect to its login page, which fetch must not follow.
const signedOut = (response: Response) => response.type === 'opaqueredirect' || response.status === 401;

export async function requestPin(body: { action: 'verify'; pin: string } | { action: 'set'; pin: string; current?: string }): Promise<PinResult> {
  try {
    const response = await fetch('/api/parent-pin', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (signedOut(response)) return { ok: false, reason: 'signin' };
    const data = await response.json() as { ok: boolean; master?: boolean; result?: string; retryAfter?: number };
    if (data.ok) return { ok: true, master: data.master };
    const reason = ['wrong', 'locked', 'unset', 'invalid'].includes(String(data.result)) ? data.result as 'wrong' : 'offline';
    return { ok: false, reason, retryAfter: data.retryAfter };
  } catch { return { ok: false, reason: 'offline' }; }
}

async function fetchStatus(): Promise<PinStatus> {
  const response = await fetch('/api/parent-pin', { cache: 'no-store', redirect: 'manual' });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json() as { pinSet: boolean }).pinSet ? 'set' : 'unset';
}

export function useParentPin(): ParentPin {
  const [status, setStatus] = useState<PinStatus>('loading');
  // Offline or signed out, the last known state stays; only the first answer may be 'unknown'.
  const refresh = useCallback(() => fetchStatus().then(setStatus, () => setStatus(current => current === 'loading' ? 'unknown' : current)), []);
  useEffect(() => {
    void refresh();
    const online = () => void refresh();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [refresh]);
  const verify = useCallback(async (pin: string) => {
    const result = await requestPin({ action: 'verify', pin });
    if (!result.ok && result.reason === 'unset') setStatus('unset');
    return result;
  }, []);
  const set = useCallback(async (pin: string, current?: string) => {
    const result = await requestPin({ action: 'set', pin, current });
    if (result.ok) setStatus('set'); else if (result.reason === 'wrong') void refresh();
    return result;
  }, [refresh]);
  return { status, refresh: () => void refresh(), verify, set };
}
