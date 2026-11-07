import { describe, expect, it } from 'vitest';
import { ProgressStore } from '../src/services/progress';
import { decodeProfile } from '../src/services/save-validation';
import { newSession } from '../src/services/session';
import { configForLevel } from '../src/generator/config';
import { solve } from '../src/solver/solver';
import { attemptMove } from '../src/core/game';

function complete(store: ProgressStore, mode: 'classic' | 'shared' | 'daily', level = 1): void {
  const session = newSession(
    mode,
    level,
    `world-${level}`,
    configForLevel(level),
    mode === 'daily' ? '2026-11-07' : null,
  );
  store.beginSession(session);
  for (const id of solve(session.state.board).sequence)
    session.state = attemptMove(session.state, id).state;
  store.recordResult(session);
  store.recordResult(session);
}

describe('free event worlds', () => {
  it('unlocks and equips a world without spending or granting energy', () => {
    const store = new ProgressStore(null);
    const energy = { ...store.profile.economy.energy };
    expect(store.equipWorld('halloween')).toBe(false);
    expect(store.unlockWorld('christmas')).toBe(true);
    expect(store.unlockWorld('christmas')).toBe(false);
    expect(store.equipWorld('christmas')).toBe(true);
    expect(store.profile.events.stamps).toBe(0);
    expect(store.profile.economy.energy).toEqual(energy);
    expect(decodeProfile(JSON.stringify(store.profile))?.settings.world).toBe('christmas');
  });
  it('earns stamps once from new classic levels and first daily wins, never shared practice or replays', () => {
    const store = new ProgressStore(null);
    complete(store, 'shared');
    expect(store.profile.events.stamps).toBe(1);
    complete(store, 'classic');
    complete(store, 'classic');
    expect(store.profile.events.stamps).toBe(2);
    complete(store, 'daily');
    complete(store, 'daily');
    expect(store.profile.events.stamps).toBe(4);
    expect(store.unlockWorld('halloween')).toBe(true);
    expect(store.profile.events.stamps).toBe(1);
    expect(store.unlockWorld('sakura')).toBe(false);
  });
  it('migrates existing saves without changing their progress or board', () => {
    const profile = new ProgressStore(null).profile;
    const old = JSON.parse(JSON.stringify(profile));
    delete old.events;
    delete old.settings.world;
    const migrated = decodeProfile(JSON.stringify(old));
    expect(migrated?.level).toBe(profile.level);
    expect(migrated?.events).toEqual({ stamps: 1, earned: 1, ownedWorlds: ['void'] });
    expect(migrated?.settings.world).toBe('void');
  });
  it('rejects negative or duplicate inventory and falls back from an unowned world', () => {
    const profile = new ProgressStore(null).profile;
    profile.settings.world = 'halloween';
    expect(decodeProfile(JSON.stringify(profile))?.settings.world).toBe('void');
    profile.events.stamps = -1;
    expect(decodeProfile(JSON.stringify(profile))).toBeNull();
    profile.events.stamps = 1;
    profile.events.ownedWorlds.push('void');
    expect(decodeProfile(JSON.stringify(profile))).toBeNull();
  });
});
