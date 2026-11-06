import { describe, expect, it } from 'vitest';
import { availableMoves } from '../src/core/board';
import { attemptMove, createGame } from '../src/core/game';
import { configForLevel } from '../src/generator/config';
import { generateLevel } from '../src/generator/generator';
import { solve } from '../src/solver/solver';
import type { Board } from '../src/core/types';

describe('independent solver', () => {
  it('detects a dependency cycle and preserves the input', () => {
    const board: Board = { width: 2, height: 1, arrows: [{ id: 'a', x: 0, y: 0, direction: 'right' }, { id: 'b', x: 1, y: 0, direction: 'left' }] };
    const before = JSON.stringify(board);
    expect(solve(board)).toMatchObject({ solvable: false, initialMoves: 0, remaining: ['a', 'b'] });
    expect(JSON.stringify(board)).toBe(before);
  });

  it('handles empty boards and partially removable cycles', () => {
    expect(solve({ width: 1, height: 1, arrows: [] })).toMatchObject({ solvable: true, sequence: [], depth: 0 });
    const board: Board = { width: 3, height: 2, arrows: [{ id: 'a', x: 0, y: 0, direction: 'right' }, { id: 'b', x: 1, y: 0, direction: 'left' }, { id: 'c', x: 2, y: 1, direction: 'down' }] };
    expect(solve(board)).toMatchObject({ solvable: false, sequence: ['c'], remaining: ['a', 'b'] });
  });
});

describe('seeded reverse generator', () => {
  it('is deterministic, including the fallback', () => {
    const config = configForLevel(27);
    expect(generateLevel('flecha-α', config)).toEqual(generateLevel('flecha-α', config));
    expect(generateLevel('fallback', config, 0)).toEqual(generateLevel('fallback', config, 0));
    expect(generateLevel('other', config).board).not.toEqual(generateLevel('flecha-α', config).board);
  });

  it('matches the board progression and varies density separately', () => {
    expect([1, 3, 6, 16, 31, 61, 101, 1000000].map((n) => configForLevel(n).width)).toEqual([4, 5, 6, 7, 8, 9, 10, 10]);
    expect(configForLevel(7).density).not.toBe(configForLevel(14).density);
    expect(configForLevel(7).width).toBe(configForLevel(14).width);
    expect(() => configForLevel(0)).toThrow();
  });

  it('verifies 1,000 boards with an independent solver and executes every solution through the core', () => {
    let dependentBoards = 0;
    let fallbackCount = 0;
    for (let index = 0; index < 1000; index++) {
      const level = generateLevel(`verification-${index}`, configForLevel(1 + index % 150));
      const solution = solve(level.board);
      expect(solution.solvable, `seed ${index}`).toBe(true);
      expect(level.board.arrows.length).toBe(Math.round(level.config.width * level.config.height * level.config.density));
      expect(solution.sequence).toHaveLength(level.board.arrows.length);
      expect(new Set(solution.sequence).size).toBe(solution.sequence.length);
      expect(availableMoves(level.board).length).toBe(solution.initialMoves);
      let state = createGame(level.board);
      for (const id of solution.sequence) {
        const result = attemptMove(state, id);
        expect(result.kind, `seed ${index}, arrow ${id}`).toBe('removed');
        state = result.state;
      }
      expect(state).toMatchObject({ status: 'won', errors: 0, lives: 3 });
      if (solution.initialMoves < level.board.arrows.length / 2) dependentBoards++;
      if (level.fallback) fallbackCount++;
    }
    expect(dependentBoards).toBeGreaterThan(900);
    expect(fallbackCount).toBeLessThan(100);
  }, 60000);

  it.each([0.1, 0.5, 1])('supports density %s and bounded fallback', (density) => {
    for (const [width, height] of [[1, 1], [1, 10], [10, 1], [10, 10]] as const) {
      const level = generateLevel('edge', { width, height, density, complexity: 1 }, 0);
      expect(level.fallback).toBe(true);
      expect(level.attempts).toBe(0);
      expect(solve(level.board).solvable).toBe(true);
    }
  });

  it('rejects invalid parameters instead of looping indefinitely', () => {
    expect(() => generateLevel('', configForLevel(1))).toThrow();
    expect(() => generateLevel('x', { width: 100, height: 5, density: 0.5, complexity: 0.5 })).toThrow();
    expect(() => generateLevel('x', { width: 4, height: 4, density: NaN, complexity: 0.5 })).toThrow();
    expect(() => generateLevel('x', configForLevel(1), 11)).toThrow();
  });
});
