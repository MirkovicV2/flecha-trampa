import { describe, expect, it } from 'vitest';
import { assertBoard, availableMoves, findBlocker, isBoard } from '../src/core/board';
import { attemptMove, createGame } from '../src/core/game';
import type { Arrow, Board, Direction } from '../src/core/types';

const arrow = (id: string, x: number, y: number, direction: Direction): Arrow => ({
  id,
  x,
  y,
  direction,
});
const board = (...arrows: Arrow[]): Board => ({ width: 5, height: 5, arrows });

describe('arrow extraction and blocking', () => {
  it.each<Direction>(['up', 'right', 'down', 'left'])(
    'extracts a clear %s arrow without losing a life',
    (direction) => {
      const state = createGame(board(arrow('a', 2, 2, direction)));
      const result = attemptMove(state, 'a');
      expect(result.kind).toBe('removed');
      expect(result.state).toMatchObject({ lives: 3, errors: 0, status: 'won', moves: 1 });
      expect(state.board.arrows).toHaveLength(1);
      expect(result.state.board.arrows).toHaveLength(0);
    },
  );

  it.each<[Direction, number, number]>([
    ['up', 2, 0],
    ['right', 4, 2],
    ['down', 2, 4],
    ['left', 0, 2],
  ])('detects distant blockers toward %s', (direction, x, y) => {
    const initial = board(arrow('a', 2, 2, direction), arrow('b', x, y, 'up'));
    expect(findBlocker(initial, initial.arrows[0]!)).toHaveProperty('id', 'b');
    const result = attemptMove(createGame(initial), 'a');
    expect(result.kind).toBe('blocked');
    expect(result.state).toMatchObject({ lives: 2, errors: 1, moves: 1, status: 'playing' });
    expect(result.state.board.arrows).toHaveLength(2);
  });

  it('only blocks arrows on the forward ray, and returns the nearest blocker', () => {
    const initial = board(
      arrow('a', 2, 2, 'right'),
      arrow('behind', 1, 2, 'up'),
      arrow('off-axis', 3, 3, 'up'),
      arrow('far', 4, 2, 'up'),
      arrow('near', 3, 2, 'up'),
    );
    expect(findBlocker(initial, initial.arrows[0]!)).toHaveProperty('id', 'near');
    expect(findBlocker(board(...initial.arrows.slice(0, 3)), initial.arrows[0]!)).toBeNull();
  });

  it('makes a blocked arrow available after extracting its blocker', () => {
    const state = createGame(board(arrow('a', 1, 2, 'right'), arrow('b', 3, 2, 'up')));
    expect(availableMoves(state.board).map((item) => item.id)).toEqual(['b']);
    const next = attemptMove(state, 'b').state;
    expect(attemptMove(next, 'a').state.status).toBe('won');
  });

  it('loses exactly after three errors and rejects moves after defeat', () => {
    let state = createGame(board(arrow('a', 1, 2, 'right'), arrow('b', 3, 2, 'up')));
    for (let i = 0; i < 3; i++) state = attemptMove(state, 'a').state;
    expect(state).toMatchObject({ lives: 0, errors: 3, moves: 3, status: 'lost' });
    expect(attemptMove(state, 'b')).toMatchObject({ kind: 'ignored', state });
    expect(attemptMove(state, 'a').state).toBe(state);
  });

  it('ignores stale, double and unknown input', () => {
    const state = createGame(board(arrow('a', 0, 0, 'up'), arrow('b', 4, 4, 'down')));
    expect(attemptMove(state, 'missing').state).toBe(state);
    const next = attemptMove(state, 'a').state;
    expect(attemptMove(next, 'a').state).toBe(next);
    const won = attemptMove(next, 'b').state;
    expect(attemptMove(won, 'b').state).toBe(won);
  });

  it('supports an empty board and a single occupied cell', () => {
    expect(createGame({ width: 1, height: 1, arrows: [] }).status).toBe('won');
    expect(
      attemptMove(createGame({ width: 1, height: 1, arrows: [arrow('a', 0, 0, 'left')] }), 'a')
        .state.status,
    ).toBe('won');
  });
});

describe('board boundaries', () => {
  it.each([
    { width: 0, height: 3, arrows: [] },
    { width: 11, height: 3, arrows: [] },
    { width: 3.5, height: 3, arrows: [] },
    { width: 3, height: 3, arrows: [arrow('a', -1, 0, 'up')] },
    { width: 3, height: 3, arrows: [arrow('a', 0, 3, 'up')] },
    { width: 3, height: 3, arrows: [arrow('a', 0, 0, 'up'), arrow('a', 1, 0, 'up')] },
    { width: 3, height: 3, arrows: [arrow('a', 0, 0, 'up'), arrow('b', 0, 0, 'right')] },
    { width: 3, height: 3, arrows: [{ id: 'x', x: 0, y: 0, direction: 'diagonal' }] },
    null,
    {},
  ])('rejects invalid data %#', (value) => {
    expect(isBoard(value)).toBe(false);
    expect(() => assertBoard(value)).toThrow('Tablero inválido');
  });
});
