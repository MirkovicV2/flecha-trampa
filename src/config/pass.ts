import type { ThemeName } from './theme';
import type { SkinId } from './collection';
export const PASS_SEASON = 'S1-CAMINOS';
export const XP_PER_TIER = 100;
export type Reward =
  | { kind: 'energy' | 'hints' | 'chests' | 'shards' | 'lives' | 'stamps'; amount: number }
  | { kind: 'theme'; id: ThemeName }
  | { kind: 'skin'; id: SkinId };
export interface PassTier {
  tier: number;
  free: Reward;
  premium: Reward;
}
export const PASS_TIERS: readonly PassTier[] = [
  { tier: 1, free: { kind: 'energy', amount: 2 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 2, free: { kind: 'chests', amount: 1 }, premium: { kind: 'shards', amount: 10 } },
  { tier: 3, free: { kind: 'theme', id: 'midnight' }, premium: { kind: 'hints', amount: 5 } },
  { tier: 4, free: { kind: 'lives', amount: 2 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 5, free: { kind: 'chests', amount: 1 }, premium: { kind: 'skin', id: 'prism' } },
  { tier: 6, free: { kind: 'shards', amount: 10 }, premium: { kind: 'energy', amount: 5 } },
  { tier: 7, free: { kind: 'energy', amount: 5 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 8, free: { kind: 'theme', id: 'solar' }, premium: { kind: 'shards', amount: 30 } },
  { tier: 9, free: { kind: 'chests', amount: 1 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 10, free: { kind: 'skin', id: 'royal' }, premium: { kind: 'skin', id: 'nova' } },
  { tier: 11, free: { kind: 'skin', id: 'lance' }, premium: { kind: 'skin', id: 'frost' } },
  { tier: 12, free: { kind: 'chests', amount: 1 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 13, free: { kind: 'shards', amount: 15 }, premium: { kind: 'skin', id: 'ronin' } },
  { tier: 14, free: { kind: 'hints', amount: 2 }, premium: { kind: 'shards', amount: 25 } },
  { tier: 15, free: { kind: 'skin', id: 'ember' }, premium: { kind: 'skin', id: 'inferno' } },
  { tier: 16, free: { kind: 'stamps', amount: 3 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 17, free: { kind: 'chests', amount: 1 }, premium: { kind: 'energy', amount: 2 } },
  { tier: 18, free: { kind: 'skin', id: 'circuit' }, premium: { kind: 'skin', id: 'hologram' } },
  { tier: 19, free: { kind: 'energy', amount: 2 }, premium: { kind: 'lives', amount: 3 } },
  { tier: 20, free: { kind: 'skin', id: 'glacier' }, premium: { kind: 'skin', id: 'eclipse' } },
  { tier: 21, free: { kind: 'skin', id: 'petal' }, premium: { kind: 'skin', id: 'sakura' } },
  { tier: 22, free: { kind: 'chests', amount: 1 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 23, free: { kind: 'shards', amount: 20 }, premium: { kind: 'skin', id: 'orbit' } },
  { tier: 24, free: { kind: 'stamps', amount: 4 }, premium: { kind: 'hints', amount: 4 } },
  { tier: 25, free: { kind: 'skin', id: 'harvest' }, premium: { kind: 'chests', amount: 1 } },
  { tier: 26, free: { kind: 'lives', amount: 2 }, premium: { kind: 'shards', amount: 35 } },
  { tier: 27, free: { kind: 'chests', amount: 1 }, premium: { kind: 'energy', amount: 2 } },
  { tier: 28, free: { kind: 'skin', id: 'tide' }, premium: { kind: 'skin', id: 'abyss' } },
  { tier: 29, free: { kind: 'energy', amount: 2 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 30, free: { kind: 'skin', id: 'noel' }, premium: { kind: 'skin', id: 'aurora' } },
  { tier: 31, free: { kind: 'chests', amount: 1 }, premium: { kind: 'shards', amount: 40 } },
  { tier: 32, free: { kind: 'stamps', amount: 5 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 33, free: { kind: 'shards', amount: 25 }, premium: { kind: 'lives', amount: 3 } },
  { tier: 34, free: { kind: 'hints', amount: 3 }, premium: { kind: 'shards', amount: 45 } },
  { tier: 35, free: { kind: 'skin', id: 'shogun' }, premium: { kind: 'chests', amount: 1 } },
  { tier: 36, free: { kind: 'chests', amount: 1 }, premium: { kind: 'stamps', amount: 6 } },
  { tier: 37, free: { kind: 'lives', amount: 2 }, premium: { kind: 'energy', amount: 3 } },
  { tier: 38, free: { kind: 'shards', amount: 30 }, premium: { kind: 'chests', amount: 1 } },
  { tier: 39, free: { kind: 'energy', amount: 3 }, premium: { kind: 'shards', amount: 60 } },
  { tier: 40, free: { kind: 'skin', id: 'phoenix' }, premium: { kind: 'skin', id: 'dragon' } },
];

export const MAX_PASS_TIER = PASS_TIERS.length;
/** Shared by event handlers and save validation; never hard-code the season length. */
export function parseRewardKey(value: unknown): { track: 'free' | 'premium'; tier: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(free|premium):([1-9]\d*)$/.exec(value);
  if (!match) return null;
  const tier = Number(match[2]);
  return Number.isSafeInteger(tier) && tier <= MAX_PASS_TIER
    ? { track: match[1] as 'free' | 'premium', tier }
    : null;
}
