import { describe, expect, it } from 'vitest';
import { createGame, attemptMove } from '../src/core/game';
import {
  defaultEnergy,
  ENERGY_REFILL_MS,
  energyWaitMs,
  regenerateEnergy,
  spendEnergy,
} from '../src/services/energy';
import { defaultEconomy, rollChest } from '../src/services/economy';
import { ProgressStore, SAVE_KEY } from '../src/services/progress';
import type { StoragePort } from '../src/services/progress';
import { newSession, tutorialSession } from '../src/services/session';
import { configForLevel } from '../src/generator/config';
import { solve } from '../src/solver/solver';
import { decodeProfile, isSavedSession } from '../src/services/save-validation';
import { PASS_SEASON } from '../src/config/pass';
import { MonetizationService } from '../src/services/monetization';

class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
const game = (level = 1) => newSession('classic', level, `energy-${level}`, configForLevel(level));
const win = (session: ReturnType<typeof game>) => {
  for (const id of solve(session.state.board).sequence)
    session.state = attemptMove(session.state, id).state;
};

describe('energy lifecycle', () => {
  it('starts full, keeps partial refill time and never banks time while full', () => {
    const full = defaultEnergy(1000);
    const spent = spendEnergy(full, 1000 + ENERGY_REFILL_MS * 20)!;
    expect(spent.amount).toBe(4);
    expect(energyWaitMs(spent, spent.updatedAt + 3000)).toBe(ENERGY_REFILL_MS - 3000);
    expect(regenerateEnergy(spent, spent.updatedAt + ENERGY_REFILL_MS).amount).toBe(5);
    expect(
      regenerateEnergy({ amount: 0, updatedAt: 1000 }, 1000 + ENERGY_REFILL_MS * 30).amount,
    ).toBe(5);
  });
  it('handles empty energy, backwards time, overfill and premium capacity', () => {
    const empty = { amount: 0, updatedAt: 2000 };
    expect(spendEnergy(empty, 3000)).toBeNull();
    expect(regenerateEnergy(empty, 1000)).toEqual(empty);
    expect(regenerateEnergy(empty, Number.NaN)).toEqual(empty);
    expect(regenerateEnergy(empty, 2000 + ENERGY_REFILL_MS * 20, 8).amount).toBe(8);
    expect(spendEnergy({ amount: 7, updatedAt: 1000 }, 2000)!.amount).toBe(6);
  });
  it('charges new attempts once, resumes for free and keeps practice available', () => {
    const store = new ProgressStore(new MemoryStorage());
    const first = game();
    expect(store.beginSession(first)).toBe(true);
    expect(store.beginSession(first)).toBe(true);
    expect(store.profile.economy.energy.amount).toBe(4);
    for (let i = 0; i < 4; i++) expect(store.beginSession(game())).toBe(true);
    expect(store.beginSession(game())).toBe(false);
    expect(store.profile.stats.played).toBe(5);
    expect(store.beginSession(tutorialSession())).toBe(true);
    expect(store.beginSession(newSession('shared', 1, 'practice', configForLevel(1)))).toBe(true);
    expect(store.profile.economy.energy.amount).toBe(0);
  });
  it('keeps the attempt cost after winning and does not give replay XP', () => {
    const store = new ProgressStore(new MemoryStorage());
    const first = game();
    store.beginSession(first);
    win(first);
    store.recordResult(first);
    store.recordResult(first);
    expect(store.profile.economy.energy.amount).toBe(4);
    expect(store.profile.economy.pass.xp).toBe(125);
    const replay = game();
    store.beginSession(replay);
    win(replay);
    store.recordResult(replay);
    expect(replay.rewardXp).toBe(0);
    expect(store.profile.economy.pass.xp).toBe(125);
    expect(store.profile.economy.energy.amount).toBe(3);
  });
  it('uses five charges for five wins and keeps the empty-energy practice escape', () => {
    const store = new ProgressStore(new MemoryStorage());
    for (let level = 1; level <= 5; level++) {
      const session = game(level);
      expect(store.beginSession(session)).toBe(true);
      win(session);
      store.recordResult(session);
      expect(store.profile.economy.energy.amount).toBe(5 - level);
    }
    expect(store.beginSession(game(6))).toBe(false);
    expect(store.beginSession(newSession('shared', 6, 'free-practice', configForLevel(6)))).toBe(
      true,
    );
    expect(store.profile.economy.energy.amount).toBe(0);
  });
  it('honors one legacy refund through reload without changing an old board', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    const session = game();
    store.beginSession(session);
    delete session.energyPolicy;
    store.flush();
    const recovered = new ProgressStore(storage);
    const saved = recovered.profile.classicSave!;
    expect(saved.initialBoard).toEqual(session.initialBoard);
    expect(recovered.beginSession(saved)).toBe(true);
    expect(saved.energyPolicy).toBeUndefined();
    win(saved);
    recovered.recordResult(saved);
    recovered.recordResult(saved);
    expect(recovered.profile.economy.energy.amount).toBe(5);
    expect(new ProgressStore(storage).profile.economy.energy.amount).toBe(5);
  });
});

describe('pass, chests and ownership', () => {
  it('claims free rewards once and never unlocks premium from saved flags', () => {
    const store = new ProgressStore(new MemoryStorage());
    expect(store.claimPassReward(1, 'free')).toBe(false);
    store.profile.economy.pass.xp = 1000;
    expect(store.claimPassReward(1, 'premium')).toBe(false);
    expect(store.claimPassReward(1, 'free')).toBe(true);
    expect(store.claimPassReward(1, 'free')).toBe(false);
    expect(store.profile.economy.energy.amount).toBe(7);
    expect(store.claimPassReward(3, 'free')).toBe(true);
    expect(store.profile.economy.collection.ownedThemes).toContain('midnight');
    expect(store.claimPassReward(10, 'free')).toBe(true);
    expect(store.profile.economy.collection.ownedSkins).toContain('royal');
    store.applyEntitlements({ adsRemoved: false, ownedThemes: [], battlePassSeason: PASS_SEASON });
    expect(store.hasPremium).toBe(true);
    expect(store.energyCapacity).toBe(8);
    expect(store.claimPassReward(1, 'premium')).toBe(true);
    store.applyEntitlements({ adsRemoved: false, ownedThemes: [], battlePassSeason: 'expired' });
    expect(store.hasPremium).toBe(false);
    expect(store.claimPassReward(2, 'premium')).toBe(false);
  });
  it.each([
    [0, 'common'],
    [0.6, 'rare'],
    [0.88, 'epic'],
    [0.98, 'legendary'],
  ] as const)('uses disclosed rarity boundaries %s', (roll, rarity) => {
    expect(rollChest(defaultEconomy(), () => roll)?.rarity).toBe(rarity);
  });
  it('compensates duplicates and guarantees epic or better on the tenth chest', () => {
    const economy = defaultEconomy();
    economy.collection.chests = 10;
    economy.collection.keys = 10;
    expect(rollChest(economy, () => 0)).toMatchObject({ duplicate: false, skin: 'chevron' });
    for (let i = 0; i < 8; i++)
      expect(rollChest(economy, () => 0)).toMatchObject({ duplicate: true, shards: 2 });
    expect(rollChest(economy, () => 0)).toMatchObject({ rarity: 'epic', duplicate: false });
    expect(economy.collection.shards).toBe(16);
    expect(economy.collection.sinceEpic).toBe(0);
    expect(rollChest(economy)).toBeNull();
  });
  it('does not spend a chest when randomness fails and crafts only affordable skins', () => {
    const economy = defaultEconomy();
    expect(() => rollChest(economy, () => 1)).toThrow();
    expect(economy.collection.chests).toBe(1);
    const store = new ProgressStore(new MemoryStorage());
    expect(store.craftSkin('vector')).toBe(false);
    store.profile.economy.collection.shards = 15;
    expect(store.craftSkin('vector')).toBe(true);
    expect(store.craftSkin('vector')).toBe(false);
    expect(store.profile.economy.collection.shards).toBe(0);
  });
});

describe('upgrade and paid boundaries', () => {
  it('earns usable extra lives from the free pass without requiring a purchase', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    store.profile.economy.pass.xp = 400;
    expect(store.claimPassReward(4, 'free')).toBe(true);
    expect(store.profile.economy.collection.lifeTokens).toBe(2);
    store.profile.economy.energy.amount = 0;
    expect(store.beginSession(game())).toBe(false);
    expect(store.profile.economy.collection.lifeTokens).toBe(2);
    store.profile.economy.energy.amount = 1;
    const session = game();
    expect(store.beginSession(session)).toBe(true);
    expect(session.state.lives).toBe(4);
    expect(session.lifeTokenSpent).toBe(true);
    const recovered = new ProgressStore(storage);
    expect(recovered.profile.classicSave?.state.lives).toBe(4);
    expect(recovered.beginSession(recovered.profile.classicSave!)).toBe(true);
    expect(recovered.profile.economy.collection.lifeTokens).toBe(1);
    expect(recovered.profile.economy.energy.amount).toBe(0);
  });
  it('migrates an old profile and preserves its active board, hints and settings', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    const session = game();
    store.beginSession(session);
    session.state = attemptMove(session.state, solve(session.state.board).sequence[0]!).state;
    store.profile.settings.theme = 'ember';
    store.profile.hints = 2;
    store.flush();
    const legacy = JSON.parse(storage.getItem(SAVE_KEY)!) as Record<string, unknown>;
    delete legacy.economy;
    delete (legacy.settings as Record<string, unknown>).skin;
    delete (legacy.stats as Record<string, unknown>).bestCombo;
    const saved = legacy.classicSave as { state: Record<string, unknown>; energySpent?: boolean };
    delete saved.state.initialLives;
    delete saved.energySpent;
    delete (saved as Record<string, unknown>).energyPolicy;
    storage.setItem(SAVE_KEY, JSON.stringify(legacy));
    const upgraded = new ProgressStore(storage);
    expect(upgraded.recovery).toBe('none');
    expect(upgraded.profile.settings).toMatchObject({ theme: 'ember', skin: 'classic' });
    expect(upgraded.profile.classicSave?.state.board).toEqual(session.state.board);
    expect(upgraded.profile.hints).toBe(2);
    expect(upgraded.profile.economy.collection.chests).toBe(1);
    expect(upgraded.beginSession(upgraded.profile.classicSave!)).toBe(true);
    expect(upgraded.profile.economy.energy.amount).toBe(5);
  });
  it('round-trips earned inventory and rejects corrupt economy or fake ownership', () => {
    const store = new ProgressStore(new MemoryStorage());
    store.openChest(() => 0.99);
    store.profile.settings.skin = store.profile.economy.collection.ownedSkins[1]!;
    expect(decodeProfile(JSON.stringify(store.profile))).toEqual(store.profile);
    store.profile.economy.energy.amount = -1;
    expect(decodeProfile(JSON.stringify(store.profile))).toBeNull();
  });
  it('supports four classic lives but leaves daily/shared rules at three', () => {
    const premium = newSession('classic', 1, 'premium', configForLevel(1), null, 4);
    expect(premium.state.lives).toBe(4);
    expect(isSavedSession(premium)).toBe(true);
    expect(newSession('daily', 1, 'daily', configForLevel(1), '2026-11-07', 4).state.lives).toBe(3);
    const badShared = newSession('shared', 1, 'shared', configForLevel(1));
    badShared.state = createGame(badShared.initialBoard, 4);
    expect(isSavedSession(badShared, 'shared')).toBe(false);
  });
  it('never fabricates energy ads or purchases', async () => {
    let rewards = 0;
    const service = new MonetizationService();
    expect(await service.rewardedEnergy(() => rewards++)).toBe('unavailable');
    expect(await service.purchases.purchase('battle-pass')).toBe('unavailable');
    expect(rewards).toBe(0);
  });
});
