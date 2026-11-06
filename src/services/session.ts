import { createGame } from '../core/game';
import type { Board, GameState } from '../core/types';
import { generateLevel } from '../generator/generator';
import { GENERATOR_VERSION } from '../generator/config';
import type { LevelConfig } from '../generator/config';

export type GameMode = 'classic' | 'daily' | 'shared' | 'tutorial';

export interface PlaySession {
  id: string;
  mode: GameMode;
  level: number;
  seed: string;
  config: LevelConfig;
  initialBoard: Board;
  state: GameState;
  elapsedMs: number;
  recorded: boolean;
  date: string | null;
  generatorVersion: string;
  counted: boolean;
}

export function newSession(
  mode: GameMode,
  level: number,
  seed: string,
  config: LevelConfig,
  date: string | null = null,
): PlaySession {
  const generated = generateLevel(seed, config);
  return {
    id: crypto.randomUUID(),
    mode,
    level,
    seed,
    config,
    initialBoard: generated.board,
    state: createGame(generated.board),
    elapsedMs: 0,
    recorded: false,
    date,
    generatorVersion: GENERATOR_VERSION,
    counted: false,
  };
}

export function tutorialSession(): PlaySession {
  const initialBoard: Board = {
    width: 4,
    height: 4,
    arrows: [
      { id: 't0', x: 3, y: 1, direction: 'right' },
      { id: 't1', x: 1, y: 1, direction: 'right' },
      { id: 't2', x: 1, y: 3, direction: 'up' },
    ],
  };
  return {
    id: crypto.randomUUID(),
    mode: 'tutorial',
    level: 1,
    seed: 'tutorial',
    config: { width: 4, height: 4, density: 0.2, complexity: 0 },
    initialBoard,
    state: createGame(initialBoard),
    elapsedMs: 0,
    recorded: false,
    date: null,
    generatorVersion: GENERATOR_VERSION,
    counted: false,
  };
}
