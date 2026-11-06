import { describe, expect, it } from 'vitest';
import { attemptMove } from '../src/core/game';
import { configForLevel } from '../src/generator/config';
import { ProgressStore, SAVE_KEY } from '../src/services/progress';
import type { StoragePort } from '../src/services/progress';
import { decodeProfile, isSavedSession } from '../src/services/save-validation';
import { newSession, tutorialSession } from '../src/services/session';
import type { PlaySession } from '../src/services/session';
import { solve } from '../src/solver/solver';

class MemoryStorage implements StoragePort {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

const classic = (level = 1): PlaySession => newSession('classic', level, `test-${level}`, configForLevel(level));
function win(session: PlaySession): void {
  for (const id of solve(session.state.board).sequence) session.state = attemptMove(session.state, id).state;
}

describe('durable progress', () => {
  it('round-trips a partially completed game, settings and free hints', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    const session = classic();
    store.beginSession(session);
    const first = solve(session.state.board).sequence[0]!;
    session.state = attemptMove(session.state, first).state;
    store.profile.settings.sound = true;
    store.profile.settings.theme = 'ember';
    store.consumeHint();
    store.addPlayTime(session, 1234.5);
    expect(store.flush()).toBe(true);
    const loaded = new ProgressStore(storage);
    expect(loaded.profile).toEqual(store.profile);
    expect(loaded.profile).not.toBe(store.profile);
    expect(loaded.profile.classicSave!.state.board.arrows.length).toBe(session.state.totalArrows - 1);
    expect(isSavedSession(loaded.profile.classicSave)).toBe(true);
  });

  it('recovers a valid backup and reports a damaged primary', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    store.flush();
    store.profile.hints = 2;
    store.flush();
    storage.setItem(SAVE_KEY, '{damaged');
    const recovered = new ProgressStore(storage);
    expect(recovered.recovery).toBe('backup');
    expect(recovered.profile.hints).toBe(3);
    expect(recovered.available).toBe(true);
  });

  it('rejects unknown schemas and inconsistent states without crashing', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ schema: 999 }));
    const store = new ProgressStore(storage);
    expect(store.recovery).toBe('reset');
    expect(store.profile.level).toBe(1);
    const session = classic();
    session.state = { ...session.state, lives: 2, errors: 0 };
    expect(isSavedSession(session)).toBe(false);
    expect(decodeProfile('null')).toBeNull();
    expect(decodeProfile('[]')).toBeNull();
    expect(decodeProfile('x'.repeat(500001))).toBeNull();
  });

  it('keeps playing in memory if storage is blocked or full', () => {
    const denied: StoragePort = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
    const store = new ProgressStore(denied);
    expect(store.available).toBe(false);
    expect(() => store.beginSession(classic())).not.toThrow();
    expect(store.flush()).toBe(false);
    expect(store.profile.stats.played).toBe(1);
    expect(new ProgressStore(null).flush()).toBe(false);
  });

  it('records starts and results exactly once and awards a real progress hint', () => {
    const store = new ProgressStore(new MemoryStorage());
    for (let level = 1; level <= 3; level++) {
      const session = classic(level);
      store.beginSession(session);
      store.beginSession(session);
      store.addPlayTime(session, 2000);
      store.addPlayTime(session, -2);
      store.addPlayTime(session, Infinity);
      win(session);
      store.recordResult(session);
      store.recordResult(session);
    }
    expect(store.profile).toMatchObject({ level: 4, hints: 4, stats: { played: 3, wins: 3, flawless: 3, totalPlayMs: 6000 } });
  });

  it('reconciles a final move saved before its result animation', () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    const session = classic();
    store.beginSession(session);
    win(session);
    store.flush();
    expect(session.recorded).toBe(false);
    const recovered = new ProgressStore(storage);
    expect(recovered.profile).toMatchObject({ level: 2, stats: { wins: 1, flawless: 1 } });
    expect(recovered.profile.classicSave!.recorded).toBe(true);
    expect(new ProgressStore(storage).profile.stats.wins).toBe(1);
  });

  it('does not count tutorial games or failed runs as victories', () => {
    const store = new ProgressStore(new MemoryStorage());
    const tutorial = tutorialSession();
    store.beginSession(tutorial);
    win(tutorial);
    store.recordResult(tutorial);
    expect(store.profile.tutorialDone).toBe(true);
    expect(store.profile.stats.played).toBe(0);
    const session = classic();
    store.beginSession(session);
    const id = session.state.board.arrows.find((arrow) => {
      const result = attemptMove(session.state, arrow.id);
      return result.kind === 'blocked';
    })!.id;
    for (let index = 0; index < 3; index++) session.state = attemptMove(session.state, id).state;
    store.recordResult(session);
    expect(store.profile.stats).toMatchObject({ played: 1, wins: 0, flawless: 0 });
    expect(store.profile.level).toBe(1);
  });

  it('never consumes a nonexistent hint and rejects modified arrow geometry', () => {
    const store = new ProgressStore(new MemoryStorage());
    for (let i = 0; i < 3; i++) expect(store.consumeHint()).toBe(true);
    expect(store.consumeHint()).toBe(false);
    expect(store.profile.hints).toBe(0);
    const session = classic();
    session.state = { ...session.state, board: { ...session.state.board, arrows: session.state.board.arrows.map((arrow, i) => i === 0 ? { ...arrow, direction: arrow.direction === 'up' ? 'down' : 'up' } : arrow) } };
    expect(isSavedSession(session)).toBe(false);
  });
});
