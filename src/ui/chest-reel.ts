import { SKINS } from '../config/collection';
import type { SkinId, Rarity } from '../config/collection';
import type { ChestDrop } from '../services/economy';

export const REEL_SLOTS = 44;
export const REEL_WINNER = 35;
export const REEL_DURATION_MS = 5200;
export interface ChestReel {
  skins: SkinId[];
  winner: number;
  offset: number;
}

/** Decorative draws are independent of the already committed inventory result. No scripted near misses. */
export function createChestReel(drop: ChestDrop, random: () => number): ChestReel {
  const draw = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new Error('Invalid decorative randomness');
    return value;
  };
  const skins = Array.from({ length: REEL_SLOTS }, () => {
    const roll = draw();
    const rarity: Rarity =
      roll < 0.6 ? 'common' : roll < 0.88 ? 'rare' : roll < 0.98 ? 'epic' : 'legendary';
    const pool = SKINS.filter((skin) => skin.rarity === rarity && skin.id !== 'classic');
    return pool[Math.floor(draw() * pool.length)]!.id;
  });
  skins[REEL_WINNER] = drop.skin;
  return { skins, winner: REEL_WINNER, offset: (draw() - 0.5) * 0.28 };
}

/** A monotonic cubic brake shared by the compositor keyframes and tick scheduler. */
export function reelProgress(time: number): number {
  const t = Number.isFinite(time) ? Math.min(1, Math.max(0, time)) : 0;
  return 1 - (1 - t) ** 3;
}

export function reelLanding(
  viewport: number,
  card: number,
  gap: number,
  reel: Pick<ChestReel, 'winner' | 'offset'>,
): number {
  if (
    ![viewport, card, gap, reel.winner, reel.offset].every(Number.isFinite) ||
    viewport <= 0 ||
    card <= 0 ||
    gap < 0 ||
    reel.winner < 0 ||
    !Number.isInteger(reel.winner) ||
    Math.abs(reel.offset) > 0.14
  )
    throw new Error('Invalid reel dimensions');
  return (viewport - card) / 2 - reel.winner * (card + gap) + reel.offset * card;
}
