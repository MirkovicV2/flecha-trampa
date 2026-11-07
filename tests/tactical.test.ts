import { describe, expect, it } from 'vitest';
import { classicConfigForLevel, isLevelConfig } from '../src/generator/config';
import { generateLevel } from '../src/generator/generator';
import { solve } from '../src/solver/solver';
import { createGame, attemptMove } from '../src/core/game';
import { BOARD_SHAPES, arrowCount } from '../src/generator/shapes';
import { createChallenge, encodeChallenge, decodeChallenge } from '../src/services/challenges';
import { isSavedSession } from '../src/services/save-validation';
import { newSession } from '../src/services/session';

describe('versioned tactical generation', () => {
  it('independently solves 600 new classic boards and executes every move through the engine', () => {
    let deeper = 0,
      fewerExits = 0,
      fallbacks = 0;
    for (let i = 0; i < 600; i++) {
      const config = classicConfigForLevel(2 + (i % 149));
      const seed = `tactical-${i}`;
      const g = generateLevel(seed, config);
      const independent = solve(g.board);
      expect(independent).toEqual(g.solution);
      expect(g.board).toEqual(generateLevel(seed, config).board);
      expect(g.board.arrows).toHaveLength(arrowCount(config));
      expect(g.attempts).toBeLessThanOrEqual(4);
      let game = createGame(g.board);
      for (const id of independent.sequence) {
        const move = attemptMove(game, id);
        expect(move.kind).toBe('removed');
        game = move.state;
      }
      expect(game).toMatchObject({ status: 'won', lives: 3, errors: 0 });
      const legacy = { ...config };
      delete legacy.tuning;
      const old = generateLevel(seed, legacy);
      deeper += Number(independent.depth > old.solution.depth);
      fewerExits += Number(independent.initialMoves < old.solution.initialMoves);
      fallbacks += Number(g.fallback);
    }
    expect(deeper).toBeGreaterThan(420);
    expect(fewerExits).toBeGreaterThan(300);
    expect(fallbacks).toBeLessThan(30);
  }, 60000);
  it('keeps fallbacks solvable at every size and mask with the new revision', () => {
    for (const shape of BOARD_SHAPES)
      for (let size = 1; size <= 10; size++) {
        const config = {
          width: size,
          height: size,
          shape,
          density: 1,
          complexity: 1,
          tuning: 'chain-v2',
        } as const;
        expect(generateLevel('emergency', config, 0).solution.solvable).toBe(true);
      }
  });
  it('round-trips FT3 and partial saves, rejecting a downgraded envelope', () => {
    const config = classicConfigForLevel(40);
    const spec = createChallenge('hard-portable', config);
    const code = encodeChallenge(spec);
    expect(code).toMatch(/^FT3\./);
    expect(decodeChallenge(code)).toEqual(spec);
    expect(() => decodeChallenge(code.replace('FT3.', 'FT2.'))).toThrow();
    const session = newSession('classic', 40, spec.seed, spec.config);
    session.state = attemptMove(session.state, solve(session.state.board).sequence[0]!).state;
    expect(isSavedSession(JSON.parse(JSON.stringify(session)))).toBe(true);
    expect(isLevelConfig({ ...config, tuning: 'unknown' })).toBe(false);
  });
});
