import { describe, expect, it } from 'vitest';
import { mastery } from '../src/core/mastery';
import { attemptMove } from '../src/core/game';
import { configForLevel } from '../src/generator/config';
import { solve } from '../src/solver/solver';
import { newSession } from '../src/services/session';
import { defaultProfile, ProgressStore, SAVE_KEY } from '../src/services/progress';
import { decodeProfile, isSavedSession } from '../src/services/save-validation';

const session = () => newSession('classic', 1, 'mastery', configForLevel(1));
const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};
function win(game: ReturnType<typeof session>) {
  for (const id of solve(game.state.board).sequence) game.state = attemptMove(game.state, id).state;
}

describe('honest mastery and persisted attempt telemetry', () => {
  it('awards only won, flawless, unassisted games three stars', () => {
    const game = session();
    expect(mastery(game.state, 0)).toBe(0);
    win(game);
    expect(mastery(game.state, 0)).toBe(3);
    expect(mastery(game.state, 1)).toBe(2);
    expect(mastery(game.state)).toBe(2);
    expect(mastery({ ...game.state, errors: 1 }, 0)).toBe(1);
    expect(mastery({ ...game.state, status: 'lost' }, 0)).toBe(0);
  });

  it('records a three-star win once, survives restart and never counts an old save as unassisted', () => {
    const port = storage();
    const store = new ProgressStore(port);
    const game = session();
    store.beginSession(game);
    game.bestCombo = 4;
    win(game);
    store.recordResult(game);
    store.recordResult(game);
    expect(store.profile.stats.mastered).toBe(1);
    expect(store.profile.stats.wins).toBe(1);
    const restored = new ProgressStore(port);
    expect(restored.profile.stats.mastered).toBe(1);
    expect(restored.profile.classicSave?.bestCombo).toBe(4);
    restored.recordResult(restored.profile.classicSave!);
    expect(restored.profile.stats.mastered).toBe(1);
    const old = session();
    delete old.hintsUsed;
    restored.beginSession(old);
    win(old);
    restored.recordResult(old);
    expect(restored.profile.stats).toMatchObject({ wins: 2, flawless: 2, mastered: 1 });
  });

  it('saves hint usage in the same transaction as its deduction and refuses ended attempts', () => {
    const port = storage();
    const store = new ProgressStore(port);
    const game = session();
    store.beginSession(game);
    expect(store.consumeHint(game)).toBe(true);
    const restored = new ProgressStore(port);
    expect(restored.profile.hints).toBe(2);
    expect(restored.profile.classicSave?.hintsUsed).toBe(1);
    win(game);
    expect(store.consumeHint(game)).toBe(false);
    store.recordResult(game);
    expect(store.profile.stats).toMatchObject({ mastered: 0, flawless: 1 });
  });

  it('migrates old statistics conservatively and validates optional telemetry', () => {
    const profile = defaultProfile();
    const old = JSON.parse(JSON.stringify(profile));
    delete old.stats.mastered;
    expect(decodeProfile(JSON.stringify(old))?.stats.mastered).toBe(0);
    const game = session();
    for (const invalid of [-1, 1.5, null, '0', 1000001]) {
      expect(isSavedSession({ ...game, hintsUsed: invalid })).toBe(false);
    }
    expect(isSavedSession({ ...game, bestCombo: 101 })).toBe(false);
    expect(
      decodeProfile(JSON.stringify({ ...profile, stats: { ...profile.stats, mastered: 1 } })),
    ).toBeNull();
    const port = storage();
    port.setItem(SAVE_KEY, JSON.stringify(old));
    expect(new ProgressStore(port).recovery).toBe('none');
  });
});
