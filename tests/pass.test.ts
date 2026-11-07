import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PASS_SEASON, PASS_TIERS, MAX_PASS_TIER, parseRewardKey } from '../src/config/pass';
import { ProgressStore, defaultProfile } from '../src/services/progress';
import { decodeProfile } from '../src/services/save-validation';
import { DUPLICATE_SHARDS } from '../src/config/collection';

describe('40-tier continuing season', () => {
  it('loads the native test fixture through the production validator', () => {
    const fixture = readFileSync(
      new URL('../android/app/src/androidTest/assets/season-profile.json', import.meta.url),
      'utf8',
    );
    const profile = decodeProfile(fixture);
    expect(profile).not.toBeNull();
    expect(profile?.economy.pass.xp).toBe(4000);
    expect(profile?.tutorialDone).toBe(true);
    expect(profile?.economy.collection.ownedSkins).toEqual(['classic']);
  });
  it('preserves earned season, XP and old claims without resetting inventory', () => {
    const old = defaultProfile();
    old.economy.pass = {
      season: PASS_SEASON,
      xp: 1260,
      claimed: ['free:1', 'free:10', 'premium:10'],
    };
    old.economy.collection.ownedSkins.push('royal', 'nova');
    expect(decodeProfile(JSON.stringify(old))).toEqual(old);
    expect(PASS_TIERS).toHaveLength(40);
    expect(PASS_TIERS.map((t) => t.tier)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });
  it('claims all 80 rewards only once and persists the expanded inventory', () => {
    const store = new ProgressStore(null);
    store.applyEntitlements({ adsRemoved: false, ownedThemes: [], battlePassSeason: PASS_SEASON });
    store.profile.economy.pass.xp = MAX_PASS_TIER * 100;
    for (const tier of PASS_TIERS)
      for (const track of ['free', 'premium'] as const) {
        expect(store.claimPassReward(tier.tier, track)).toBe(true);
        const before = JSON.stringify(store.profile);
        expect(store.claimPassReward(tier.tier, track)).toBe(false);
        expect(JSON.stringify(store.profile)).toBe(before);
      }
    expect(store.profile.economy.pass.claimed).toHaveLength(80);
    expect(store.profile.economy.collection.ownedSkins).toContain('phoenix');
    expect(store.profile.economy.collection.ownedSkins).toContain('dragon');
    expect(store.profile.events.stamps).toBe(19);
    expect(decodeProfile(JSON.stringify(store.profile))).toEqual(store.profile);
  });
  it('converts an already owned guaranteed skin to disclosed duplicate fragments', () => {
    const store = new ProgressStore(null);
    store.profile.economy.pass.xp = 4000;
    store.profile.economy.collection.ownedSkins.push('phoenix');
    expect(store.claimPassReward(40, 'free')).toBe(true);
    expect(store.profile.economy.collection.shards).toBe(DUPLICATE_SHARDS.legendary);
    expect(store.claimPassReward(40, 'free')).toBe(false);
  });
  it('shares strict tier parsing between UI and save validation', () => {
    for (const invalid of [
      'free:0',
      'free:01',
      'free:41',
      'free:1e1',
      'other:1',
      'premium:Infinity',
      null,
    ])
      expect(parseRewardKey(invalid)).toBeNull();
    expect(parseRewardKey('premium:40')).toEqual({ track: 'premium', tier: 40 });
    const store = new ProgressStore(null);
    store.profile.economy.pass.xp = 3999;
    expect(store.claimPassReward(40, 'free')).toBe(false);
    store.profile.economy.pass.claimed = ['free:40'];
    expect(decodeProfile(JSON.stringify(store.profile))).toBeNull();
  });
});
