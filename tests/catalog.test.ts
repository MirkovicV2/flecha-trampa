import { describe, expect, it } from 'vitest';
import { SKINS, RARITIES } from '../src/config/collection';
import { ARROW_DESIGNS } from '../src/config/arrow-designs';
import { arrowArt } from '../src/ui/arrow-art';
import { decodeProfile } from '../src/services/save-validation';
import { defaultProfile } from '../src/services/progress';
import { defaultEconomy, rollChest } from '../src/services/economy';

describe('expanded original catalog', () => {
  it('provides 32 unique dies, bounded coordinates and all four readable rotations', () => {
    expect(SKINS).toHaveLength(32);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(new Set(Object.values(ARROW_DESIGNS).map((d) => d.serial)).size).toBe(SKINS.length);
    expect(new Set(Object.values(ARROW_DESIGNS).map((d) => JSON.stringify(d.layers))).size).toBe(
      SKINS.length,
    );
    expect(new Set(Object.values(ARROW_DESIGNS).map((d) => d.exit)).size).toBe(16);
    for (const skin of SKINS) {
      const design = ARROW_DESIGNS[skin.id];
      expect(design.layers.length).toBeGreaterThanOrEqual(2);
      for (const layer of design.layers)
        for (const point of layer.points)
          for (const n of point) {
            expect(Number.isFinite(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(100);
          }
      for (const direction of ['up', 'right', 'down', 'left'] as const) {
        const art = arrowArt(skin.id, direction);
        expect(art).toContain(`data-skin-art="${skin.id}"`);
        expect(art).not.toMatch(/NaN|undefined/);
      }
    }
  });
  it('recovers a fully owned new collection and an unchanged legacy inventory', () => {
    const profile = defaultProfile();
    expect(decodeProfile(JSON.stringify(profile))).toEqual(profile);
    profile.economy.collection.ownedSkins = SKINS.map((s) => s.id);
    profile.settings.skin = 'aurora';
    expect(decodeProfile(JSON.stringify(profile))).toEqual(profile);
  });
  it('can award every chest skin without changing the disclosed rarity bands', () => {
    const rolls = { common: 0, rare: 0.6, epic: 0.88, legendary: 0.98 };
    for (const rarity of RARITIES) {
      const pool = SKINS.filter((s) => s.rarity === rarity && s.id !== 'classic');
      pool.forEach((skin, i) => {
        const economy = defaultEconomy();
        let calls = 0;
        expect(
          rollChest(economy, () => (calls++ === 0 ? rolls[rarity] : (i + 0.5) / pool.length)),
        ).toMatchObject({ skin: skin.id, rarity, duplicate: false });
      });
    }
  });
});
