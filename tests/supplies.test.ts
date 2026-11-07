import { describe, expect, it } from 'vitest';
import { ProgressStore } from '../src/services/progress';
import { newSession } from '../src/services/session';
import { configForLevel } from '../src/generator/config';
import { attemptMove } from '../src/core/game';
import { solve } from '../src/solver/solver';
import { decodeProfile, isSavedSession } from '../src/services/save-validation';

const wonAttempt = (mode: 'classic' | 'shared', level: number) => {
  const session = newSession(mode, level, `supply-${level}`, configForLevel(1));
  session.counted = true;
  for (const id of solve(session.state.board).sequence)
    session.state = attemptMove(session.state, id).state;
  return session;
};

describe('evergreen earned chest supply', () => {
  it('awards one chest per fifteen new classic levels, including after the pass, exactly once', () => {
    const store = new ProgressStore(null);
    for (const level of [4, 5, 6, 14, 15, 16, 30, 40, 45, 1000, 1005]) {
      store.profile.level = level;
      const before = store.profile.economy.collection.chests;
      const session = wonAttempt('classic', level);
      store.recordResult(session);
      store.recordResult(session);
      expect(store.profile.economy.collection.chests).toBe(before + Number(level % 15 === 0));
      expect(session.rewardChests ?? 0).toBe(Number(level % 15 === 0));
      expect(store.profile.economy.energy.amount).toBe(5);
    }
    store.profile.level = 1005;
    store.profile.economy.collection.chests = 999;
    const capped = wonAttempt('classic', 1005);
    store.recordResult(capped);
    expect(capped.rewardChests).toBeUndefined();
    expect(store.profile.economy.collection.chests).toBe(999);
  });
  it('never awards chest milestones for shared practice or replayed levels', () => {
    const store = new ProgressStore(null);
    store.profile.level = 46;
    for (const session of [wonAttempt('classic', 45), wonAttempt('shared', 45)])
      store.recordResult(session);
    expect(store.profile.economy.collection.chests).toBe(1);
  });
  it('round-trips a chest milestone without reconciling another award and validates its metadata', () => {
    const store = new ProgressStore(null);
    store.profile.level = 15;
    store.profile.stats.played = 1;
    const session = wonAttempt('classic', 15);
    store.profile.classicSave = session;
    store.recordResult(session);
    expect(isSavedSession(session)).toBe(true);
    expect(decodeProfile(JSON.stringify(store.profile))).toEqual(store.profile);
    expect(isSavedSession({ ...session, rewardChests: 2 })).toBe(false);
    expect(isSavedSession({ ...session, recorded: false })).toBe(false);
    const shared = { ...session, mode: 'shared' };
    expect(isSavedSession(shared, 'shared')).toBe(false);
  });
});
