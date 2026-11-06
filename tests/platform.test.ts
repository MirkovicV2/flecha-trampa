import { expect, it, vi } from 'vitest';
import { PreferencesStorage } from '../src/services/platform';
import { ProgressStore } from '../src/services/progress';

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
