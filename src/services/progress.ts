import { DEFAULT_SETTINGS } from '../config/theme';
import type { PlayerSettings } from '../config/theme';
import type { PlaySession } from './session';
import { decodeProfile } from './save-validation';
import { defaultDailyProgress, updateDaily } from './daily';
import type { DailyProgress } from './daily';

export const SAVE_KEY = 'flecha-trampa:profile:v1';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  whenIdle?(): Promise<void>;
}

export interface PlayerProfile {
  schema: 1;
  runId: string;
  level: number;
  hints: number;
  tutorialDone: boolean;
  settings: PlayerSettings;
  classicSave: PlaySession | null;
  dailySave: PlaySession | null;
  sharedSave: PlaySession | null;
  daily: DailyProgress;
  stats: {
    played: number;
    wins: number;
    flawless: number;
    totalPlayMs: number;
    arrowsCleared: number;
  };
}

export function defaultProfile(): PlayerProfile {
  return {
    schema: 1,
    runId: crypto.randomUUID(),
    level: 1,
    hints: 3,
    tutorialDone: false,
    settings: { ...DEFAULT_SETTINGS },
    classicSave: null,
    dailySave: null,
    sharedSave: null,
    daily: defaultDailyProgress(),
    stats: { played: 0, wins: 0, flawless: 0, totalPlayMs: 0, arrowsCleared: 0 },
  };
}

function browserStorage(): StoragePort | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Versioned, validated saves with a last-known-good backup and a memory-only fallback. */
export class ProgressStore {
  readonly profile: PlayerProfile;
  available: boolean;
  recovery: 'none' | 'backup' | 'reset' = 'none';
  conflicted = false;
  onConflict: (() => void) | null = null;
  onError: (() => void) | null = null;
  private lastGood: string | null = null;
  private lastObserved: string | null = null;

  constructor(private readonly storage: StoragePort | null = browserStorage()) {
    this.available = storage !== null;
    let loaded: PlayerProfile | null = null;
    if (storage) {
      try {
        const primary = storage.getItem(SAVE_KEY);
        this.lastObserved = primary;
        loaded = decodeProfile(primary);
        if (loaded) this.lastGood = primary;
        else {
          const backup = storage.getItem(`${SAVE_KEY}:backup`);
          loaded = decodeProfile(backup);
          if (loaded) {
            this.recovery = 'backup';
            this.lastGood = backup;
          } else if (primary || backup) this.recovery = 'reset';
        }
      } catch {
        this.available = false;
      }
    }
    this.profile = loaded ?? defaultProfile();
    // A page can close after the final move was saved and before its animation completed.
    for (const saved of [
      this.profile.classicSave,
      this.profile.dailySave,
      this.profile.sharedSave,
    ]) {
      if (saved && saved.state.status !== 'playing' && !saved.recorded) this.recordResult(saved);
    }
  }

  flush(): boolean {
    if (this.conflicted) return false;
    if (!this.storage) {
      this.available = false;
      return false;
    }
    if (this.detectConflict()) return false;
    try {
      const serialized = JSON.stringify(this.profile);
      if (serialized === this.lastGood) return this.available;
      if (this.lastGood) this.storage.setItem(`${SAVE_KEY}:backup`, this.lastGood);
      this.storage.setItem(SAVE_KEY, serialized);
      this.lastGood = serialized;
      this.lastObserved = serialized;
      this.available = true;
      return true;
    } catch {
      this.reportError();
      return false;
    }
  }

  detectConflict(): boolean {
    if (this.conflicted) return true;
    try {
      if (this.storage && this.storage.getItem(SAVE_KEY) !== this.lastObserved) {
        this.conflicted = true;
        this.onConflict?.();
      }
    } catch {
      this.reportError();
    }
    return this.conflicted;
  }

  reportError(): void {
    const previouslyAvailable = this.available;
    this.available = false;
    if (previouslyAvailable) this.onError?.();
  }

  async whenIdle(): Promise<void> {
    await this.storage?.whenIdle?.();
  }

  beginSession(session: PlaySession): void {
    if (session.mode !== 'tutorial' && !session.counted) {
      session.counted = true;
      this.profile.stats.played++;
    }
    if (session.mode === 'classic') this.profile.classicSave = session;
    if (session.mode === 'daily') this.profile.dailySave = session;
    if (session.mode === 'shared') this.profile.sharedSave = session;
    this.flush();
  }

  addPlayTime(session: PlaySession, milliseconds: number): void {
    if (!nonNegativeTime(milliseconds)) return;
    session.elapsedMs += milliseconds;
    if (session.mode !== 'tutorial') this.profile.stats.totalPlayMs += milliseconds;
  }

  consumeHint(): boolean {
    if (this.profile.hints < 1) return false;
    this.profile.hints--;
    this.flush();
    return true;
  }

  recordResult(session: PlaySession): void {
    if (session.recorded || session.state.status === 'playing') return;
    session.recorded = true;
    if (session.mode === 'tutorial') {
      if (session.state.status === 'won') this.profile.tutorialDone = true;
    } else if (session.state.status === 'won') {
      this.profile.stats.wins++;
      if (!session.state.errors) this.profile.stats.flawless++;
      if (this.profile.stats.wins % 3 === 0)
        this.profile.hints = Math.min(99, this.profile.hints + 1);
      if (session.mode === 'classic')
        this.profile.level = Math.max(this.profile.level, session.level + 1);
    }
    if (session.mode === 'daily' && session.date) {
      this.profile.daily = updateDaily(this.profile.daily, session.date, {
        won: session.state.status === 'won',
        timeMs: session.elapsedMs,
        errors: session.state.errors,
      });
    }
    this.flush();
  }
}

const nonNegativeTime = (value: number): boolean => Number.isFinite(value) && value >= 0;
