import { knacks } from './words.mjs';
import { learningDay, learningIndex, trickySpots, wordProgress } from './learning.mjs';

export const REFRESH_BONUS = 10;

// Every few rounds Schreibi suggests a short personal bonus round. Repeated slips at the same Knackstelle
// lead to a Regelweg round on exactly that rule; otherwise long-unpractised words are written again.
export function refreshSuggestion(batches, attempts, sessions, introductions, now = Date.now()) {
  const rounds = sessions.filter(s => ['discover', 'listen', 'rule', 'morph', 'write'].includes(s.mode)).length;
  if (rounds < 3 || rounds % 3 !== 0 || sessions.some(s => s.refreshId && learningDay(s.at) === learningDay(now))) return null;
  const index = learningIndex(attempts, introductions), words = [], seen = new Set();
  for (const batch of batches) for (const word of batch.words) if (!seen.has(word.id)) { seen.add(word.id); if (wordProgress(word, index, now).introduced) words.push(word); }
  const spot = trickySpots(attempts, now - 14 * 86400000).find(s => s.count >= 2 && !['silben', 'betonung', 'laenge', 'paar', 'baustein'].includes(s.key));
  if (spot) {
    const wordIds = words.filter(w => knacks(w).some(k => k.key === spot.key)).sort((a, b) => Number(spot.words.includes(b.text)) - Number(spot.words.includes(a.text))).slice(0, 5).map(w => w.id);
    if (wordIds.length >= 2) return { id: `refresh:${learningDay(now)}:${rounds}:rule`, mode: /** @type {const} */ ('rule'), knack: spot.key, wordIds, reason: 'spelling', bonus: REFRESH_BONUS };
  }
  const rare = words.map(word => ({ word, p: wordProgress(word, index, now) })).filter(x => x.p.needsHelp || x.p.latest && now - x.p.latest.at >= 7 * 86400000);
  if (rare.length < 2) return null;
  return { id: `refresh:${learningDay(now)}:${rounds}:write`, mode: /** @type {const} */ ('write'), knack: '', wordIds: rare.slice(0, 5).map(x => x.word.id), reason: rare.some(x => x.p.needsHelp) ? 'tricky' : 'rare', bonus: REFRESH_BONUS };
}
