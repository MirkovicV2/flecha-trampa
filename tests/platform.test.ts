import { expect, it, vi } from 'vitest';
import { PreferencesStorage } from '../src/services/platform';
import { ProgressStore, SAVE_KEY } from '../src/services/progress';
import { newSession } from '../src/services/session';

it('keeps the complete hint transaction queued until native Preferences acknowledges earlier saves', async () => {
  const native = new Map<string, string>();
  let release!: () => void;
  const delayedWrite = new Promise<void>((resolve) => {
    release = resolve;
  });
  const storage = new PreferencesStorage(
    new Map(),
    {
      get: async ({ key }) => ({ value: native.get(key) ?? null }),
      set: async ({ key, value }) => {
        await delayedWrite;
        native.set(key, value);
      },
    },
    () => {
      throw new Error('Unexpected native storage error');
    },
  );
  const store = new ProgressStore(storage);
  const session = newSession('shared', 1, 'slow-preferences', {
    width: 4,
    height: 4,
    density: 0.7,
    complexity: 0.65,
  });
  expect(store.beginSession(session)).toBe(true);
  expect(store.consumeHint(session)).toBe(true);
  expect(store.profile.hints).toBe(2);
  expect(native.has(SAVE_KEY)).toBe(false);
  release();
  await store.whenIdle();
  const restored = new ProgressStore({
    getItem: (key) => native.get(key) ?? null,
    setItem: () => undefined,
  });
  expect(restored.profile.hints).toBe(2);
  expect(restored.profile.sharedSave?.id).toBe(session.id);
  expect(restored.profile.sharedSave?.hintsUsed).toBe(1);
  expect(restored.profile.sharedSave?.state.board).toEqual(session.state.board);
});

it('serializes native backup and primary writes and recovers after an adapter error', async () => {
  const writes: string[] = [];
  const onError = vi.fn();
  let fail = true;
  const port = {
    get: async () => ({ value: null }),
    set: async ({ key }: { key: string; value: string }) => {
      writes.push(key);
      if (fail) {
        fail = false;
        throw new Error('native unavailable');
      }
    },
  };
  const storage = new PreferencesStorage(new Map(), port, onError);
  storage.setItem('backup', 'old');
  storage.setItem('primary', 'new');
  await storage.whenIdle();
  expect(writes).toEqual(['backup', 'primary']);
  expect(onError).toHaveBeenCalledOnce();
  expect(storage.getItem('primary')).toBe('new');
});

it('protects a newer save from a stale tab and reports a conflict exactly once', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const first = new ProgressStore(storage);
  first.flush();
  const stale = new ProgressStore(storage);
  const onConflict = vi.fn();
  stale.onConflict = onConflict;
  first.profile.hints = 2;
  first.flush();
  stale.profile.hints = 1;
  expect(stale.flush()).toBe(false);
  expect(stale.flush()).toBe(false);
  expect(stale.conflicted).toBe(true);
  expect(onConflict).toHaveBeenCalledOnce();
  expect(new ProgressStore(storage).profile.hints).toBe(2);
});
