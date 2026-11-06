import { isBoard } from '../core/board';
import { GENERATOR_VERSION, isLevelConfig } from '../generator/config';
import { solve } from '../solver/solver';
import type { PlayerProfile } from './progress';
import type { PlaySession } from './session';
import { defaultDailyProgress, isDailyProgress, isUtcDate } from './daily';
import { integer, isRecord, nonNegative } from '../utils/validation';

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128;

export function isSavedSession(value: unknown, mode: 'classic' | 'daily' | 'shared' = 'classic'): value is PlaySession {
  if (!isRecord(value) || value.mode !== mode || !text(value.id) || !text(value.seed) || !integer(value.level, 1)) return false;
  if (value.generatorVersion !== GENERATOR_VERSION || typeof value.counted !== 'boolean' || typeof value.recorded !== 'boolean' || !nonNegative(value.elapsedMs)) return false;
  if (!isLevelConfig(value.config) || !isBoard(value.initialBoard) || !isRecord(value.state) || !isBoard(value.state.board)) return false;
  const currentBoard = value.state.board;
  const { state, initialBoard, config } = value;
  if (config.width !== initialBoard.width || config.height !== initialBoard.height || initialBoard.arrows.length < 1) return false;
  if (currentBoard.width !== initialBoard.width || currentBoard.height !== initialBoard.height) return false;
  if (value.date !== null && !isUtcDate(value.date) || mode === 'daily' && !isUtcDate(value.date)) return false;
  if (!integer(state.lives, 0, 3) || !integer(state.errors, 0, 3) || state.lives !== 3 - state.errors) return false;
  if (state.totalArrows !== initialBoard.arrows.length || !integer(state.moves)) return false;
  const remaining = currentBoard.arrows.length;
  if (state.moves !== initialBoard.arrows.length - remaining + state.errors) return false;
  const expectedStatus = state.lives === 0 ? 'lost' : remaining === 0 ? 'won' : 'playing';
  if (state.status !== expectedStatus || (state.lives === 0 && remaining === 0) || (value.recorded && state.status === 'playing')) return false;
  const originals = new Map(initialBoard.arrows.map((arrow) => [arrow.id, arrow]));
  for (const arrow of currentBoard.arrows) {
    const original = originals.get(arrow.id);
    if (!original || original.x !== arrow.x || original.y !== arrow.y || original.direction !== arrow.direction) return false;
  }
  return solve(initialBoard).solvable && solve(currentBoard).solvable;
}

export function decodeProfile(serialized: string | null): PlayerProfile | null {
  if (!serialized || serialized.length > 500000) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.schema !== 1 || !text(value.runId) || !integer(value.level, 1) || !integer(value.hints, 0, 99) || typeof value.tutorialDone !== 'boolean') return null;
    if (value.classicSave !== null && !isSavedSession(value.classicSave)) return null;
    if (value.dailySave === undefined) value.dailySave = null;
    if (value.daily === undefined) value.daily = defaultDailyProgress();
    if (value.dailySave !== null && !isSavedSession(value.dailySave, 'daily') || !isDailyProgress(value.daily)) return null;
    if (!isRecord(value.settings) || typeof value.settings.sound !== 'boolean' || typeof value.settings.haptics !== 'boolean' || typeof value.settings.reducedMotion !== 'boolean' || !['aurora', 'ember'].includes(String(value.settings.theme))) return null;
    const stats = value.stats;
    if (!isRecord(stats) || !integer(stats.played) || !integer(stats.wins) || !integer(stats.flawless) || !integer(stats.arrowsCleared) || !nonNegative(stats.totalPlayMs)) return null;
    if (stats.flawless > stats.wins || stats.wins > stats.played) return null;
    return value as unknown as PlayerProfile;
  } catch { return null; }
}
