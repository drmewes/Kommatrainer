// Cloudflare Access signs every request it lets through (header `Cf-Access-Jwt-Assertion`).
// The Worker trusts only a valid signature from the configured team, never plain identity headers.
const keyCache = new Map();
const KEY_TTL = 60 * 60 * 1000;

const base64url = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
const json = value => JSON.parse(new TextDecoder().decode(base64url(value)));

async function teamKeys(teamDomain, fetcher, refresh) {
  const cached = keyCache.get(teamDomain);
  if (cached && !refresh && Date.now() - cached.at < KEY_TTL) return cached.keys;
  const response = await fetcher(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error('Access certificates unavailable: ' + response.status);
  const keys = new Map();
  for (const jwk of (await response.json()).keys || []) {
    if (jwk.kty === 'RSA' && jwk.kid) keys.set(jwk.kid, await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
  }
  keyCache.set(teamDomain, { at: Date.now(), keys });
  return keys;
}

/**
 * @param {string | null | undefined} token
 * @param {{ teamDomain?: string; audience?: string; now?: number; fetcher?: (url: string) => Promise<Response> }} [options]
 * @returns {Promise<{ email: string; sub?: string } | null>}
 */
export async function verifyAccessJwt(token, { teamDomain, audience, now = Date.now(), fetcher = fetch } = {}) {
  if (!token || !teamDomain || !audience) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = json(parts[0]), claims = json(parts[1]);
    if (header.alg !== 'RS256' || !header.kid) return null;
    let key = (await teamKeys(teamDomain, fetcher, false)).get(header.kid);
    // Access rotates its signing keys; an unknown key id means the cache is stale.
    if (!key) key = (await teamKeys(teamDomain, fetcher, true)).get(header.kid);
    if (!key) return null;
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const seconds = now / 1000;
    if (!valid || claims.iss !== `https://${teamDomain}` || !audiences.includes(audience)) return null;
    if (typeof claims.exp !== 'number' || claims.exp < seconds || typeof claims.nbf === 'number' && claims.nbf > seconds + 60) return null;
    return typeof claims.email === 'string' && claims.email ? { email: claims.email, sub: claims.sub } : null;
  } catch { return null; }
}
