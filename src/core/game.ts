import { assertBoard, findBlocker } from './board';
import type { Board, GameState, MoveResult } from './types';

export const INITIAL_LIVES = 3;

export function createGame(board: Board): GameState {
  assertBoard(board);
  return {
    board: { ...board, arrows: board.arrows.map((arrow) => ({ ...arrow })) },
    lives: INITIAL_LIVES,
    errors: 0,
    moves: 0,
    totalArrows: board.arrows.length,
    status: board.arrows.length ? 'playing' : 'won',
  };
}

/** Pure, immutable transition. Repeated input against an already removed ID is harmless. */
export function attemptMove(state: GameState, arrowId: string): MoveResult {
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
  const arrows = state.board.arrows.filter((item) => item.id !== arrowId);
  return {
    kind: 'removed',
    arrow,
    blocker: null,
    state: {
      ...state,
      board: { ...state.board, arrows },
      moves: state.moves + 1,
      status: arrows.length ? 'playing' : 'won',
    },
  };
}
