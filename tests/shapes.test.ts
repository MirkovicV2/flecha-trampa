import { describe, expect, it } from 'vitest';
import { BOARD_SHAPES, arrowCount, containsCell, shapeCells } from '../src/generator/shapes';
import { classicConfigForLevel, isLevelConfig } from '../src/generator/config';
import { generateLevel } from '../src/generator/generator';
import { solve } from '../src/solver/solver';
import { attemptMove, createGame } from '../src/core/game';
import { createChallenge, decodeChallenge, encodeChallenge } from '../src/services/challenges';
import { newSession } from '../src/services/session';
import { isSavedSession } from '../src/services/save-validation';

describe('deterministic silhouette boards', () => {
  it('preserves legacy rectangles and adds variety only to new classic configurations', () => {
    const config = { width: 6, height: 6, density: 0.7, complexity: 0.8 };
    expect(generateLevel('legacy', config).board).toEqual(
      generateLevel('legacy', { ...config, shape: 'square' }).board,
    );
    expect(classicConfigForLevel(1).shape).toBeUndefined();
    expect(new Set([3, 4, 5, 6, 7].map((n) => classicConfigForLevel(n).shape)).size).toBe(5);
    expect(isLevelConfig({ ...config, shape: 'unknown' })).toBe(false);
    expect(isLevelConfig({ ...config, shape: null })).toBe(false);
  });

  it.each(BOARD_SHAPES)(
    'solves 80 independent %s seeds through the real engine',
    (shape) => {
      let dependent = 0;
      for (let seed = 0; seed < 80; seed++) {
        const size = 5 + (seed % 6);
        const config = { width: size, height: size, shape, density: 0.87, complexity: 0.9 };
        const level = generateLevel(`mask-${seed}`, config);
        expect(level.board).toEqual(generateLevel(`mask-${seed}`, config).board);
        expect(level.board.arrows).toHaveLength(arrowCount(config));
        for (const arrow of level.board.arrows)
          expect(containsCell(size, size, shape, arrow.x, arrow.y)).toBe(true);
        const solution = solve(level.board);
        expect(solution.solvable).toBe(true);
        expect(solution.depth).toBeGreaterThanOrEqual(2);
        if (solution.initialMoves < level.board.arrows.length / 2) dependent++;
        let state = createGame(level.board);
        for (const id of solution.sequence) {
          const result = attemptMove(state, id);
          expect(result.kind).toBe('removed');
          state = result.state;
        }
        expect(state).toMatchObject({ status: 'won', lives: 3, errors: 0 });
      }
      // Open silhouettes have more exits; at least two thirds still start mostly blocked.
      expect(dependent).toBeGreaterThanOrEqual(Math.ceil((80 * 2) / 3));
    },
    60000,
  );

  it('keeps a full, solvable fallback for all 500 rectangular masks, including tiny ones', () => {
    for (const shape of BOARD_SHAPES)
      for (let width = 1; width <= 10; width++)
        for (let height = 1; height <= 10; height++) {
          const config = { width, height, shape, density: 1, complexity: 1 };
          const level = generateLevel('bounded', config, 0);
          expect(level.fallback).toBe(true);
          expect(level.attempts).toBe(0);
          expect(level.board.arrows.length).toBeGreaterThan(0);
          expect(level.board.arrows).toHaveLength(shapeCells(width, height, shape).length);
          expect(solve(level.board).solvable).toBe(true);
        }
  });

  it.each(BOARD_SHAPES)('round-trips %s challenge links and partially played saves', (shape) => {
    const config = { width: 7, height: 7, shape, density: 0.8, complexity: 0.8 };
    const spec = createChallenge('portátil', config);
    const restored = decodeChallenge(encodeChallenge(spec));
    expect(restored).toEqual(spec);
    const session = newSession('classic', 16, restored.seed, restored.config);
    session.state = attemptMove(session.state, solve(session.state.board).sequence[0]!).state;
    expect(isSavedSession(JSON.parse(JSON.stringify(session)))).toBe(true);
    if (shape !== 'square') {
      const cell = shapeCells(7, 7).find(({ x, y }) => !containsCell(7, 7, shape, x, y))!;
      const invalid = structuredClone(session);
      Object.assign(invalid.initialBoard.arrows[0]!, cell);
      expect(isSavedSession(invalid)).toBe(false);
    }
  });
});
