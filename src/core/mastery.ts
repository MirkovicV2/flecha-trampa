import type { GameState } from './types';

/** Stars describe actual play. Older saves without hint telemetry cannot earn star three. */
export function mastery(state: GameState, hintsUsed?: number): number {
  if (state.status !== 'won') return 0;
  if (state.errors > 0) return 1;
  return hintsUsed === 0 ? 3 : 2;
}
