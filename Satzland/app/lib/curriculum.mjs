import { packages } from './words.mjs';

// The class-5 plan: 31 Etappen of rules and words, plus the family's own word lists.
export const PLAN_VERSION = 'lrs-klasse5-2026-27-v1';
export const builtinPackages = packages;
const builtinById = new Map(packages.map(p => [p.id, p]));
export const clampDaily = value => Math.max(3, Math.min(10, Math.round(Number(value) || 5)));

export function packageState(state) {
  // Parents can edit a built-in Etappe (their copy replaces it), hide it, or reset it to the original.
  const stored = new Map(state.batches.filter(b => builtinById.has(b.id)).map(b => [b.id, b]));
  const builtin = packages.flatMap(p => {
    const own = stored.get(p.id);
    if (own?.deleted) return [];
    if (own && !own.reset && Array.isArray(own.words)) return [{ ...p, name: own.name || p.name, description: own.description || p.description, words: own.words, edited: true }];
    return [p];
  });
  const own = state.batches.filter(b => !builtinById.has(b.id) && !b.deleted && Array.isArray(b.words));
  const batches = [...builtin, ...own];
  const active = state.settings.activeBatchId;
  return { ...state, batches, settings: { ...state.settings,
    activeBatchId: batches.some(b => b.id === active) ? active : batches[0]?.id || '',
    dailyNewLimit: clampDaily(state.settings.dailyNewLimit),
    weeklyGoal: Math.max(1, Math.min(4, Math.round(Number(state.settings.weeklyGoal) || 2))),
    reviewLevel: ['low', 'normal', 'high'].includes(state.settings.reviewLevel) ? state.settings.reviewLevel : 'normal',
    keyboard: state.settings.keyboard === 'abc' ? 'abc' : 'qwertz',
    testSize: Math.max(6, Math.min(14, Number(state.settings.testSize) || 10)) } };
}
export const originalPackage = id => builtinById.get(id) || null;

// The Etappe whose calendar week contains the given day, for the first start of a new account.
export function currentPackageId(day = new Date().toISOString().slice(0, 10)) {
  const match = packages.find(p => day <= p.to) || packages.at(-1);
  return match.id;
}
