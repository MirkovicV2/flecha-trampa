import { describe, expect, it } from 'vitest';
import { SKINS } from '../src/config/collection';
import { seededRandom } from '../src/utils/random';
import {
  createChestReel,
  reelLanding,
  reelProgress,
  REEL_SLOTS,
  REEL_WINNER,
} from '../src/ui/chest-reel';

const drop = { skin: 'prism', rarity: 'epic', duplicate: false, shards: 0 } as const;

describe('chest presentation integrity', () => {
  it('lands on every awarded skin and never mutates the committed result', () => {
    for (const skin of SKINS.filter((skin) => skin.id !== 'classic')) {
      const result = { ...drop, skin: skin.id, rarity: skin.rarity };
      const snapshot = structuredClone(result);
      const reel = createChestReel(result, seededRandom(`reel:${skin.id}`));
      expect(reel.skins).toHaveLength(REEL_SLOTS);
      expect(reel.skins[reel.winner]).toBe(result.skin);
      expect(reel.winner).toBe(REEL_WINNER);
      expect(
        reel.skins.every((id) => SKINS.some((item) => item.id === id && id !== 'classic')),
      ).toBe(true);
      expect(result).toEqual(snapshot);
    }
  });
  it('does not rig adjacent cards when the outcome changes', () => {
    const first = createChestReel(drop, seededRandom('same-decorations'));
    const second = createChestReel(
      { ...drop, skin: 'nova', rarity: 'legendary' },
      seededRandom('same-decorations'),
    );
    for (let i = 0; i < REEL_SLOTS; i++) {
      if (i !== REEL_WINNER) expect(first.skins[i]).toBe(second.skins[i]);
    }
    expect(first.offset).toBe(second.offset);
  });
  it('rejects invalid decorative random values', () => {
    for (const value of [NaN, Infinity, -0.01, 1])
      expect(() => createChestReel(drop, () => value)).toThrow();
  });
  it('keeps the award under the pointer on narrow, wide and offset landings', () => {
    for (const viewport of [272, 345, 788])
      for (const card of [126, 148])
        for (const offset of [-0.14, 0, 0.14]) {
          const gap = 10;
          const translation = reelLanding(viewport, card, gap, { winner: REEL_WINNER, offset });
          const left = translation + REEL_WINNER * (card + gap);
          expect(viewport / 2 - left).toBeGreaterThan(card * 0.35);
          expect(viewport / 2 - left).toBeLessThan(card * 0.65);
        }
  });
  it('brakes monotonically without overshooting or reversing', () => {
    const positions = Array.from({ length: 1001 }, (_, i) => reelProgress(i / 1000));
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBe(1);
    for (let i = 1; i < positions.length; i++)
      expect(positions[i]).toBeGreaterThanOrEqual(positions[i - 1]!);
    expect(reelProgress(0.1) - reelProgress(0)).toBeGreaterThan(
      reelProgress(0.9) - reelProgress(0.8),
    );
    expect(reelProgress(-1)).toBe(0);
    expect(reelProgress(2)).toBe(1);
    expect(reelProgress(NaN)).toBe(0);
  });
  it('fails safely for invalid layout measurements', () => {
    expect(() => reelLanding(0, 126, 8, { winner: 35, offset: 0 })).toThrow();
    expect(() => reelLanding(345, NaN, 8, { winner: 35, offset: 0 })).toThrow();
    expect(() => reelLanding(345, 126, -8, { winner: 35, offset: 0 })).toThrow();
    expect(() => reelLanding(345, 126, 8, { winner: 1.5, offset: 0 })).toThrow();
    expect(() => reelLanding(345, 126, 8, { winner: 35, offset: 0.5 })).toThrow();
  });
});
