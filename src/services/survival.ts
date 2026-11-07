import type { PlaySession } from './session';
import type { LevelConfig } from '../generator/config';

export interface SurvivalState {
  pendingIds: string[];
  arrivalInMs: number;
  congestionMs: number;
}

export const CONGESTION_LIMIT_MS = 10000;
/** Smooth active-time pressure, independent of wave clears; floor reached asymptotically. */
export const arrivalInterval = (_level: number, elapsedMs = 0): number =>
  2200 + 2800 * Math.exp(-Math.max(0, elapsedMs) / 150000);
export const arrivalSize = (level: number): number => Math.min(4, 2 + Math.floor((level - 1) / 3));
export const congestionThreshold = (session: PlaySession): number =>
  Math.ceil(session.initialBoard.width * session.initialBoard.height * 0.7);

export function survivalConfig(level: number): LevelConfig {
  const size = level < 6 ? 6 : 7;
  return {
    width: size,
    height: size,
    density: 0.86,
    complexity: Math.min(0.95, 0.6 + level * 0.025),
    tuning: 'chain-v2',
  };
}

/** All arrivals are a subset of one solvable board: adding them cannot introduce cycles. */
export function prepareSurvival(session: PlaySession): void {
  const arrows = session.initialBoard.arrows;
  session.survival = {
    pendingIds: arrows.slice(10).map((arrow) => arrow.id),
    arrivalInMs: arrivalInterval(session.level, session.elapsedMs),
    congestionMs: 0,
  };
  session.state = {
    ...session.state,
    board: { ...session.initialBoard, arrows: arrows.slice(0, 10) },
  };
}

/** Old wave saves keep every remaining piece and life; the next wave uses arrivals. */
export function resumeSurvival(session: PlaySession): void {
  session.survival ??= {
    pendingIds: [],
    arrivalInMs: arrivalInterval(session.level, session.elapsedMs),
    congestionMs: 0,
  };
}

export function keepSurvivalPlaying(session: PlaySession): void {
  if (session.state.status === 'won' && session.survival?.pendingIds.length)
    session.state = { ...session.state, status: 'playing' };
}

export function tickSurvival(
  session: PlaySession,
  deltaMs: number,
): { arrived: number; lifeLost: boolean } {
  const survival = session.survival;
  if (session.mode !== 'endless' || !survival || session.state.status !== 'playing')
    return { arrived: 0, lifeLost: false };
  let arrived = 0;
  survival.arrivalInMs = Math.max(0, survival.arrivalInMs - deltaMs);
  if (survival.arrivalInMs === 0 && survival.pendingIds.length) {
    const incoming = new Set(survival.pendingIds.splice(0, arrivalSize(session.level)));
    const arrows = session.initialBoard.arrows.filter((arrow) => incoming.has(arrow.id));
    arrived = arrows.length;
    session.state = {
      ...session.state,
      board: { ...session.state.board, arrows: [...session.state.board.arrows, ...arrows] },
    };
    survival.arrivalInMs = arrivalInterval(session.level, session.elapsedMs);
  }
  const congested = session.state.board.arrows.length >= congestionThreshold(session);
  survival.congestionMs = congested ? survival.congestionMs + deltaMs : 0;
  const lifeLost = survival.congestionMs >= CONGESTION_LIMIT_MS;
  if (lifeLost) {
    survival.congestionMs = 0;
    const lives = Math.max(0, session.state.lives - 1);
    session.state = {
      ...session.state,
      lives,
      errors: session.state.errors + 1,
      moves: session.state.moves + 1,
      status: lives ? 'playing' : 'lost',
    };
  }
  return { arrived, lifeLost };
}
