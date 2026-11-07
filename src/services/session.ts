import { createGame } from '../core/game';
import type { Board, GameState } from '../core/types';
import { generateLevel } from '../generator/generator';
import { GENERATOR_VERSION, classicConfigForLevel } from '../generator/config';
import type { LevelConfig } from '../generator/config';
import { prepareSurvival, survivalConfig } from './survival';
import type { SurvivalState } from './survival';
import { selectPowerArrow, powerForLevel, createPowerSequence } from '../core/special-arrow';
import type { PowerKind } from '../core/special-arrow';

export type GameMode = 'classic' | 'daily' | 'shared' | 'tutorial' | 'endless';

// One disposable campaign cache; saved sessions always retain their own deal.
let campaignPowers: { runId: string; at: (level: number) => PowerKind | null } | undefined;

function dealPower(
  runId: string,
  level: number,
  board: Board,
  config: LevelConfig,
): PowerKind | null {
  const canonical =
    runId.startsWith('classic:') &&
    JSON.stringify(config) === JSON.stringify(classicConfigForLevel(level));
  if (!canonical) {
    return powerForLevel(runId, level, (current) =>
      current === level ? board : generateLevel(`${runId}:${current}`, config).board,
    );
  }
  if (campaignPowers?.runId !== runId) {
    campaignPowers = {
      runId,
      at: createPowerSequence(
        runId,
        (current) => generateLevel(`${runId}:${current}`, classicConfigForLevel(current)).board,
      ),
    };
  }
  return campaignPowers.at(level);
}

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
  energySpent?: boolean;
  /** Present only on attempts started under the new non-refundable energy rules. */
  energyPolicy?: 'attempt-v2';
  rewardXp?: number;
  rewardChests?: number;
  forgeReward?: 'progress' | 'key';
  lifeTokenSpent?: boolean;
  hintsUsed?: number;
  bestCombo?: number;
  /** Un único despeje especial, solo en partidas clásicas nuevas. */
  powerArrowId?: string | null;
  powerKind?: PowerKind;
  /** Distinguishes an intentionally empty eligible-bag deal from legacy saves. */
  powerPolicy?: 'eligible-v1';
  survival?: SurvivalState;
}

export function newSession(
  mode: GameMode,
  level: number,
  seed: string,
  config: LevelConfig,
  date: string | null = null,
  initialLives: 3 | 4 = 3,
): PlaySession {
  if (mode === 'endless') config = survivalConfig(level);
  const generated = generateLevel(seed, config);
  const runId = seed.replace(/:\d+$/, '');
  const powerKind = mode === 'classic' ? dealPower(runId, level, generated.board, config) : null;
  const session: PlaySession = {
    id: crypto.randomUUID(),
    mode,
    level,
    seed,
    config,
    initialBoard: generated.board,
    state: createGame(generated.board, mode === 'classic' ? initialLives : 3),
    elapsedMs: 0,
    recorded: false,
    date,
    generatorVersion: GENERATOR_VERSION,
    counted: false,
    hintsUsed: 0,
    bestCombo: 0,
    ...(mode === 'classic'
      ? {
          powerPolicy: 'eligible-v1' as const,
          ...(powerKind ? { powerKind } : {}),
          powerArrowId: powerKind ? selectPowerArrow(generated.board, level, powerKind) : null,
        }
      : {}),
  };
  if (mode === 'endless') prepareSurvival(session);
  return session;
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
    hintsUsed: 0,
    bestCombo: 0,
  };
}

/** Advance one run without buying another attempt or restoring its lives. */
export function advanceEndlessSession(session: PlaySession): boolean {
  if (session.mode !== 'endless' || session.state.status !== 'won') return false;
  const level = session.level + 1;
  const seed = `endless:${session.id}:${level}`;
  const config = survivalConfig(level);
  const { board } = generateLevel(seed, config);
  const { lives, errors } = session.state;
  session.level = level;
  session.seed = seed;
  session.config = config;
  session.initialBoard = board;
  // Errors belong to the whole run; moves are the current wave's cleared arrows
  // plus those errors, preserving the save validation invariant.
  session.state = { ...createGame(board), lives, errors, moves: errors };
  prepareSurvival(session);
  return true;
}
