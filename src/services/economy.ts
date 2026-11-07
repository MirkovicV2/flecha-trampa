import { SKINS, DUPLICATE_SHARDS } from '../config/collection';
import type { SkinId, Rarity } from '../config/collection';
import { FREE_THEMES } from '../config/theme';
import type { ThemeName } from '../config/theme';
import { PASS_SEASON } from '../config/pass';
import { defaultEnergy } from './energy';
import type { EnergyState } from './energy';

export interface ChestDrop {
  skin: SkinId;
  rarity: Rarity;
  duplicate: boolean;
  shards: number;
}
export interface EconomyState {
  energy: EnergyState;
  pass: { season: string; xp: number; claimed: string[] };
  collection: {
    ownedSkins: SkinId[];
    ownedThemes: ThemeName[];
    shards: number;
    chests: number;
    lifeTokens: number;
    opened: number;
    sinceEpic: number;
  };
}
export function defaultEconomy(now = Date.now()): EconomyState {
  return {
    energy: defaultEnergy(now),
    pass: { season: PASS_SEASON, xp: 0, claimed: [] },
    collection: {
      ownedSkins: ['classic'],
      ownedThemes: [...FREE_THEMES],
      shards: 0,
      chests: 1,
      lifeTokens: 0,
      opened: 0,
      sinceEpic: 0,
    },
  };
}

export function secureRoll(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0]! / 0x100000000;
}

/** Chests are earned through play, never sold. Every tenth guarantees epic or better. */
export function rollChest(
  economy: EconomyState,
  random: () => number = secureRoll,
): ChestDrop | null {
  const collection = economy.collection;
  if (collection.chests < 1) return null;
  const roll = random();
  const selection = random();
  if (![roll, selection].every((value) => Number.isFinite(value) && value >= 0 && value < 1))
    throw new Error('Invalid chest randomness');
  const rarity: Rarity =
    roll >= 0.98
      ? 'legendary'
      : collection.sinceEpic >= 9 || roll >= 0.88
        ? 'epic'
        : roll >= 0.6
          ? 'rare'
          : 'common';
  const pool = SKINS.filter((skin) => skin.rarity === rarity && skin.id !== 'classic');
  const skin = pool[Math.floor(selection * pool.length)]!.id;
  const duplicate = collection.ownedSkins.includes(skin);
  const shards = duplicate ? DUPLICATE_SHARDS[rarity] : 0;
  collection.chests--;
  collection.opened++;
  collection.sinceEpic = rarity === 'epic' || rarity === 'legendary' ? 0 : collection.sinceEpic + 1;
  if (!duplicate) collection.ownedSkins.push(skin);
  collection.shards = Math.min(99999, collection.shards + shards);
  return { skin, rarity, duplicate, shards };
}
