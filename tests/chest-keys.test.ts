import { describe, expect, it, vi } from 'vitest';
import { ProgressStore, defaultProfile, SAVE_KEY } from '../src/services/progress';
import { defaultEconomy, rollChest } from '../src/services/economy';
import { decodeProfile, isSavedSession } from '../src/services/save-validation';
import { newSession, tutorialSession } from '../src/services/session';
import { configForLevel } from '../src/generator/config';
import { attemptMove } from '../src/core/game';
import { solve } from '../src/solver/solver';
import { PASS_TIERS, PASS_SEASON } from '../src/config/pass';

const won = (mode: 'classic' | 'daily' | 'shared', level: number, date: string | null = null) => {
  const session = newSession(mode, level, `keys-${mode}-${level}`, configForLevel(1), date);
  session.counted = true;
  for (const id of solve(session.state.board).sequence)
    session.state = attemptMove(session.state, id).state;
  return session;
};

describe('earned chest keys', () => {
  it('requires both resources and never draws randomness or alters inventory when blocked', () => {
    for (const resource of ['keys', 'chests'] as const) {
      const economy = defaultEconomy();
      economy.collection[resource] = 0;
      const before = structuredClone(economy);
      const random = vi.fn(() => 0);
      expect(rollChest(economy, random)).toBeNull();
      expect(random).not.toHaveBeenCalled();
      expect(economy).toEqual(before);
    }
  });
  it.each([NaN, -1, 1, Infinity])(
    'does not debit either resource on invalid randomness %s',
    (roll) => {
      const economy = defaultEconomy();
      const before = structuredClone(economy);
      expect(() => rollChest(economy, () => roll)).toThrow();
      expect(economy).toEqual(before);
    },
  );
  it('atomically spends one key and one chest, persists once, and rejects a second opening', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const store = new ProgressStore(storage);
    store.profile.economy.collection.chests = 3;
    const energy = structuredClone(store.profile.economy.energy);
    expect(store.openChest(() => 0)?.skin).toBe('chevron');
    expect(store.profile.economy.collection).toMatchObject({ chests: 2, keys: 0, opened: 1 });
    expect(new ProgressStore(storage).openChest(() => 0)).toBeNull();
    expect(store.profile.economy.energy).toEqual(energy);
  });
  it('migrates old stock, claims and pity intact with a single starter key', () => {
    const profile = defaultProfile();
    profile.economy.collection.chests = 61;
    profile.economy.collection.opened = 27;
    profile.economy.collection.sinceEpic = 7;
    profile.economy.pass = { season: PASS_SEASON, xp: 4000, claimed: ['free:5', 'premium:9'] };
    const old = JSON.stringify(profile, (key, value: unknown) =>
      key === 'keys' || key === 'keyProgress' ? undefined : value,
    );
    expect(decodeProfile(old)).toEqual(profile);
    const values = new Map([[SAVE_KEY, old]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const store = new ProgressStore(storage);
    expect(store.openChest(() => 0)).not.toBeNull();
    const restored = new ProgressStore(storage);
    expect(restored.profile.economy.collection).toMatchObject({
      chests: 60,
      keys: 0,
      opened: 28,
      sinceEpic: 8,
    });
    expect(restored.profile.economy.pass).toEqual(profile.economy.pass);
    expect(restored.openChest(() => 0)).toBeNull();
  });
  it('forges one key after five new victories and preserves partial progress on reload', () => {
    const store = new ProgressStore(null);
    store.profile.economy.collection.keys = 0;
    for (let level = 1; level <= 10; level++) {
      const session = won('classic', level);
      store.profile.stats.played++;
      store.recordResult(session);
      store.recordResult(session);
      expect(store.profile.economy.collection.keys).toBe(Math.floor(level / 5));
      expect(store.profile.economy.collection.keyProgress).toBe(level % 5);
      expect(session.forgeReward).toBe(level % 5 === 0 ? 'key' : 'progress');
      expect(isSavedSession(session)).toBe(true);
      expect(decodeProfile(JSON.stringify(store.profile))).toEqual(store.profile);
    }
  });
  it('counts the first daily completion once, and never shared practice or classic replays', () => {
    const store = new ProgressStore(null);
    store.profile.level = 20;
    store.recordResult(won('classic', 19));
    store.recordResult(won('shared', 20));
    store.recordResult(won('daily', 1, '2026-11-07'));
    store.recordResult(won('daily', 1, '2026-11-07'));
    expect(store.profile.economy.collection.keyProgress).toBe(1);
    const loss = tutorialSession();
    loss.mode = 'classic';
    for (let move = 0; move < 3; move++) loss.state = attemptMove(loss.state, 't1').state;
    expect(loss.state.status).toBe('lost');
    store.recordResult(loss);
    store.recordResult(tutorialSession());
    expect(store.profile.economy.collection.keyProgress).toBe(1);
  });
  it('does not overflow a full key inventory or report an ungranted key', () => {
    const store = new ProgressStore(null);
    store.profile.economy.collection.keys = 998;
    store.profile.economy.collection.keyProgress = 4;
    const earned = won('classic', 1);
    store.recordResult(earned);
    expect(earned.forgeReward).toBe('key');
    const capped = won('classic', 2);
    store.recordResult(capped);
    expect(store.profile.economy.collection).toMatchObject({ keys: 999, keyProgress: 0 });
    expect(capped.forgeReward).toBeUndefined();
  });
  it.each([-1, 0.5, 1000, null, '1'])(
    'rejects corrupted key balances %s without resetting valid zero',
    (keys) => {
      const profile = defaultProfile();
      const invalid = {
        ...profile,
        economy: { ...profile.economy, collection: { ...profile.economy.collection, keys } },
      };
      expect(decodeProfile(JSON.stringify(invalid))).toBeNull();
      profile.economy.collection.keys = 0;
      expect(decodeProfile(JSON.stringify(profile))).toEqual(profile);
    },
  );
  it.each([-1, 0.5, 5, null, '0'])('rejects corrupted forge progress %s', (keyProgress) => {
    const profile = defaultProfile();
    const invalid = {
      ...profile,
      economy: { ...profile.economy, collection: { ...profile.economy.collection, keyProgress } },
    };
    expect(decodeProfile(JSON.stringify(invalid))).toBeNull();
  });
  it('validates forge receipts and never repeats recovery after a final animation is interrupted', () => {
    const profile = defaultProfile();
    profile.stats.played = 1;
    profile.economy.collection.keys = 0;
    profile.economy.collection.keyProgress = 4;
    profile.classicSave = won('classic', 1);
    const values = new Map([[SAVE_KEY, JSON.stringify(profile)]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const store = new ProgressStore(storage);
    expect(store.profile.economy.collection).toMatchObject({ keys: 1, keyProgress: 0 });
    expect(store.profile.classicSave?.forgeReward).toBe('key');
    const saved = store.profile.classicSave!;
    for (const forgeReward of [null, ['key'], 1, 'unknown'])
      expect(isSavedSession({ ...saved, forgeReward })).toBe(false);
    expect(isSavedSession({ ...saved, mode: 'shared' }, 'shared')).toBe(false);
    expect(isSavedSession({ ...saved, recorded: false })).toBe(false);
    expect(new ProgressStore(storage).profile).toEqual(store.profile);
  });
  it('reduces pass stock to nine free and twelve Plus chests without removing its 80 prizes', () => {
    expect(PASS_TIERS).toHaveLength(40);
    for (const [track, total] of [
      ['free', 9],
      ['premium', 12],
    ] as const) {
      const chests = PASS_TIERS.flatMap((tier) =>
        tier[track].kind === 'chests' ? [tier[track]] : [],
      );
      expect(chests.every((reward) => reward.kind === 'chests' && reward.amount === 1)).toBe(true);
      expect(chests).toHaveLength(total);
    }
    const store = new ProgressStore(null);
    store.applyEntitlements({ adsRemoved: false, ownedThemes: [], battlePassSeason: PASS_SEASON });
    store.profile.economy.collection.keys = 0;
    store.profile.economy.pass.xp = 4000;
    expect(store.claimPassReward(1, 'premium')).toBe(true);
    expect(store.openChest(() => 0)).toBeNull();
  });
});
