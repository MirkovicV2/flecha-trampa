import { assertBoard, findBlocker } from './board';
import type { Board, GameState, MoveResult } from './types';
import { specialArrowTargets } from './special-arrow';
import type { PowerKind } from './special-arrow';

export const INITIAL_LIVES = 3;

export function createGame(board: Board, initialLives: 3 | 4 = INITIAL_LIVES): GameState {
  assertBoard(board);
  if (initialLives !== 3 && initialLives !== 4) throw new Error('Número de vidas inválido.');
  return {
    board: { ...board, arrows: board.arrows.map((arrow) => ({ ...arrow })) },
    initialLives,
    lives: initialLives,
    errors: 0,
    moves: 0,
    totalArrows: board.arrows.length,
    status: board.arrows.length ? 'playing' : 'won',
  };
}

/** Pure, immutable transition. Repeated input against an already removed ID is harmless. */
export function attemptMove(
  state: GameState,
  arrowId: string,
  powerArrowId: string | null = null,
  powerKind: PowerKind = 'pulse',
): MoveResult {
  const arrow = state.board.arrows.find((item) => item.id === arrowId) ?? null;
  if (state.status !== 'playing' || !arrow)
    return { kind: 'ignored', state, arrow: null, blocker: null };
  const blocker = findBlocker(state.board, arrow);
  if (blocker) {
    const lives = Math.max(0, state.lives - 1);
    return {
      kind: 'blocked',
      arrow,
      blocker,
      state: {
        ...state,
        lives,
        errors: state.errors + 1,
        moves: state.moves + 1,
        status: lives === 0 ? 'lost' : 'playing',
      },
    };
  }
  const additionalArrows =
    arrowId === powerArrowId ? specialArrowTargets(state.board, arrow, powerKind) : [];
  const removedIds = new Set([arrowId, ...additionalArrows.map((item) => item.id)]);
  const arrows = state.board.arrows.filter((item) => !removedIds.has(item.id));
  return {
    kind: 'removed',
    arrow,
    blocker: null,
    additionalArrows,
    state: {
      ...state,
      board: { ...state.board, arrows },
      // The persisted move counter counts cleared pieces and errors. This remains one input.
      moves: state.moves + removedIds.size,
      status: arrows.length ? 'playing' : 'won',
    },
  };
}
