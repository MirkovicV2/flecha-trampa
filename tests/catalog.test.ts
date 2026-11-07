import { describe, expect, it } from 'vitest';
import { SKINS, RARITIES } from '../src/config/collection';
import { ARROW_DESIGNS } from '../src/config/arrow-designs';
import type { Point } from '../src/config/arrow-designs';
import { arrowArt } from '../src/ui/arrow-art';
import { decodeProfile } from '../src/services/save-validation';
import { defaultProfile } from '../src/services/progress';
import { defaultEconomy, rollChest } from '../src/services/economy';

describe('expanded original catalog', () => {
  it('uses simple filled plates so SVG and WebGL can triangulate the same contours', () => {
    const orientation = (a: Point, b: Point, c: Point) =>
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const crosses = (a: Point, b: Point, c: Point, d: Point) => {
      const o = [
        orientation(a, b, c),
        orientation(a, b, d),
        orientation(c, d, a),
        orientation(c, d, b),
      ];
      if (o[0]! * o[1]! < 0 && o[2]! * o[3]! < 0) return true;
      if (!o.every((n) => n === 0)) return false;
      const axis = a[0] === b[0] ? 1 : 0;
      return (
        Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])) <
        Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]))
      );
    };
    for (const skin of SKINS)
      for (const layer of ARROW_DESIGNS[skin.id].layers) {
        if (!layer.fill) continue;
        const p = layer.points,
          n = p.length;
        for (let i = 0; i < n; i++)
          for (let j = i + 2; j < n; j++) {
            if (i === 0 && j === n - 1) continue;
            expect(
              crosses(p[i]!, p[(i + 1) % n]!, p[j]!, p[(j + 1) % n]!),
              `${skin.id}: edges ${i},${j}`,
            ).toBe(false);
          }
      }
  });
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
