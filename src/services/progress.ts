import { DEFAULT_SETTINGS } from '../config/theme';
import type { PlayerSettings } from '../config/theme';
import type { PlaySession } from './session';

export interface PlayerProfile {
  schema: 1;
  runId: string;
  level: number;
  hints: number;
  tutorialDone: boolean;
  settings: PlayerSettings;
  classicSave: PlaySession | null;
  stats: { played: number; wins: number; flawless: number; totalPlayMs: number; arrowsCleared: number };
}

export function defaultProfile(): PlayerProfile {
  return {
    schema: 1, runId: crypto.randomUUID(), level: 1, hints: 3, tutorialDone: false,
    settings: { ...DEFAULT_SETTINGS }, classicSave: null,
    stats: { played: 0, wins: 0, flawless: 0, totalPlayMs: 0, arrowsCleared: 0 },
  };
}

/** Session-facing repository. A durable adapter is added independently of the renderer. */
export class ProgressStore {
  readonly profile = defaultProfile();
  available = true;
  flush(): void { /* In-memory repository used by the initial interface. */ }
}
