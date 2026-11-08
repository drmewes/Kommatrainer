// The parent PIN only keeps children out of the parent area; it is checked on the server so the
// hash never reaches the browser. The master PIN always opens the area so parents can reset a forgotten PIN.
export const MASTER_PIN = '53129';
export const PIN_RECORD_ID = 'parent-pin';
// The free Workers plan allows about 10 ms CPU per request, so the hash stays deliberately light.
const ITERATIONS = 10000;
const FREE_TRIES = 5, MAX_LOCK = 15 * 60 * 1000;

export const validPin = pin => typeof pin === 'string' && /^\d{4,6}$/.test(pin);

const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
async function derive(pin, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations }, key, 256);
  return hex(bits);
}

export async function hashPin(pin) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, iterations: ITERATIONS, hash: await derive(pin, salt, ITERATIONS), failures: 0, lockedUntil: 0 };
}

// After five wrong tries each further one waits twice as long, starting at 30 seconds.
export function lockAfter(failures, now) {
  return failures < FREE_TRIES ? 0 : now + Math.min(MAX_LOCK, 30000 * 2 ** (failures - FREE_TRIES));
}

/**
 * @param {{ salt: string; iterations: number; hash: string; failures?: number; lockedUntil?: number } | null} stored
 * @returns {Promise<{ result: 'master' | 'ok' | 'wrong' | 'locked' | 'unset'; stored: typeof stored; retryAfter?: number }>}
 */
export async function checkPin(stored, pin, now = Date.now()) {
  if (pin === MASTER_PIN) return { result: 'master', stored: stored && { ...stored, failures: 0, lockedUntil: 0 } };
  if (!stored) return { result: 'unset', stored };
  if ((stored.lockedUntil || 0) > now) return { result: 'locked', stored, retryAfter: Math.ceil((stored.lockedUntil - now) / 1000) };
  if (validPin(pin) && await derive(pin, stored.salt, stored.iterations) === stored.hash) return { result: 'ok', stored: { ...stored, failures: 0, lockedUntil: 0 } };
  const failures = (stored.failures || 0) + 1, lockedUntil = lockAfter(failures, now);
  return { result: 'wrong', stored: { ...stored, failures, lockedUntil }, ...(lockedUntil ? { retryAfter: Math.ceil((lockedUntil - now) / 1000) } : {}) };
}
