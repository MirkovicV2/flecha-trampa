import type { ThemeName } from './theme';
import type { SkinId } from './collection';
export const PASS_SEASON = 'S1-CAMINOS';
export const XP_PER_TIER = 100;
export type Reward =
  | { kind: 'energy' | 'hints' | 'chests' | 'shards' | 'lives'; amount: number }
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
  { tier: 4, free: { kind: 'lives', amount: 2 }, premium: { kind: 'chests', amount: 2 } },
  { tier: 5, free: { kind: 'chests', amount: 2 }, premium: { kind: 'skin', id: 'prism' } },
  { tier: 6, free: { kind: 'shards', amount: 10 }, premium: { kind: 'energy', amount: 5 } },
  { tier: 7, free: { kind: 'energy', amount: 5 }, premium: { kind: 'chests', amount: 2 } },
  { tier: 8, free: { kind: 'theme', id: 'solar' }, premium: { kind: 'shards', amount: 30 } },
  { tier: 9, free: { kind: 'chests', amount: 2 }, premium: { kind: 'chests', amount: 3 } },
  { tier: 10, free: { kind: 'skin', id: 'royal' }, premium: { kind: 'skin', id: 'nova' } },
];
