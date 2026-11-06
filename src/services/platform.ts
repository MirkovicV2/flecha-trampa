import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ProgressStore, SAVE_KEY } from './progress';
import type { StoragePort } from './progress';

interface PreferencesPort {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}

/** Synchronous session cache; native writes are serialized to preserve backup-before-save order. */
export class PreferencesStorage implements StoragePort {
  private pending: Promise<void> = Promise.resolve();
  constructor(
    private readonly values: Map<string, string>,
    private readonly port: PreferencesPort,
    private readonly onError: () => void,
  ) {}
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
    this.pending = this.pending
      .then(() => this.port.set({ key, value }))
      .catch(() => {
        this.onError();
      });
  }
  async whenIdle(): Promise<void> {
    await this.pending;
  }
}

export async function createProgressStore(): Promise<ProgressStore> {
  if (!Capacitor.isNativePlatform()) return new ProgressStore();
  try {
    const values = new Map<string, string>();
    for (const key of [SAVE_KEY, `${SAVE_KEY}:backup`]) {
      const result = await Preferences.get({ key });
      if (result.value !== null) values.set(key, result.value);
    }
    let store: ProgressStore | null = null;
    const storage = new PreferencesStorage(values, Preferences, () => store?.reportError());
    store = new ProgressStore(storage);
    return store;
  } catch {
    return new ProgressStore(null);
  }
}

export function bindNativeLifecycle(pause: () => void, back: () => void): void {
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) pause();
  }).catch(() => undefined);
  if (Capacitor.getPlatform() === 'android')
    void App.addListener('backButton', back).catch(() => undefined);
}

export function minimizeNativeApp(): void {
  if (Capacitor.getPlatform() === 'android') void App.minimizeApp().catch(() => undefined);
}
