import { DIRECTIONS, VECTORS } from '../core/types';
import type { Arrow, Board, Direction } from '../core/types';
import { solve } from '../solver/solver';
import type { Solution } from '../solver/solver';
import { seededRandom } from '../utils/random';
import { GENERATOR_VERSION, isLevelConfig } from './config';
import type { LevelConfig } from './config';
import { arrowCount, containsCell, shapeCells } from './shapes';
import { tacticalBoard } from './tactical';

export interface GeneratedLevel {
  readonly board: Board;
  readonly seed: string;
  readonly version: typeof GENERATOR_VERSION;
  readonly config: LevelConfig;
  readonly solution: Solution;
  readonly fallback: boolean;
  readonly attempts: number;
}

function reverseBoard(config: LevelConfig, random: () => number, target: number): Board {
  const { width, height } = config;
  const arrows: Arrow[] = [];
  const occupied = new Set<number>();
  for (let index = 0; index < target; index++) {
    const pressure = new Array<number>(width * height).fill(0);
    for (const existing of arrows) {
      const [dx, dy] = VECTORS[existing.direction];
      for (
        let x = existing.x + dx, y = existing.y + dy;
        x >= 0 && y >= 0 && x < width && y < height;
        x += dx, y += dy
      ) {
        pressure[y * width + x] = (pressure[y * width + x] ?? 0) + 1;
      }
    }
    let best: { x: number; y: number; direction: Direction; score: number } | null = null;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (
          occupied.has(y * width + x) ||
          !containsCell(width, height, config.shape ?? 'square', x, y)
        )
          continue;
        for (const direction of DIRECTIONS) {
          const [dx, dy] = VECTORS[direction];
          let clear = true;
          for (
            let xx = x + dx, yy = y + dy;
            xx >= 0 && yy >= 0 && xx < width && yy < height;
            xx += dx, yy += dy
          ) {
            if (occupied.has(yy * width + xx)) {
              clear = false;
              break;
            }
          }
          if (!clear) continue;
          const score =
            (pressure[y * width + x] ?? 0) * (0.4 + config.complexity * 3) + random() * 2;
          if (!best || score > best.score) best = { x, y, direction, score };
        }
      }
    if (!best) break;
    // At insertion time its ray is clear. Reverse insertion order is therefore a solution.
    arrows.push({ id: `a${index}`, x: best.x, y: best.y, direction: best.direction });
    occupied.add(best.y * width + best.x);
  }
  return { width, height, arrows };
}

function fallbackBoard(config: LevelConfig, target: number, random: () => number): Board {
  const cells = shapeCells(config.width, config.height, config.shape);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  const potential = ({ x, y }: { x: number; y: number }) =>
    Math.max(Math.abs(2 * x - config.width + 1), Math.abs(2 * y - config.height + 1));
  // Every outward ray strictly increases this potential. Insert inner layers first:
  // previously inserted cells therefore cannot block a new arrow, even at 100% density.
  const arrows = cells
    .slice(0, target)
    .sort((a, b) => potential(a) - potential(b))
    .map(({ x, y }, index): Arrow => {
      const dx = 2 * x - config.width + 1;
      const dy = 2 * y - config.height + 1;
      const horizontal =
        Math.abs(dx) > Math.abs(dy) || (Math.abs(dx) === Math.abs(dy) && random() < 0.5);
      const direction: Direction = horizontal
        ? dx < 0
          ? 'left'
          : 'right'
        : dy < 0
          ? 'up'
          : 'down';
      return { id: `a${index}`, x, y, direction };
    });
  return { width: config.width, height: config.height, arrows };
}

function quality(solution: Solution, count: number): number {
  return (
    (count - solution.initialMoves) / count +
    solution.depth * 0.15 +
    (solution.dependencies / count) * 0.1
  );
}

export function generateLevel(seed: string, config: LevelConfig, maxAttempts = 4): GeneratedLevel {
  if (typeof seed !== 'string' || seed.length < 1 || seed.length > 128)
    throw new Error('Semilla inválida.');
  if (!isLevelConfig(config)) throw new Error('Configuración de nivel inválida.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 10)
    throw new Error('Límite de generación inválido.');
  const target = arrowCount(config);
  let best: { board: Board; solution: Solution } | null = null;
  let attempts = 0;
  for (; attempts < maxAttempts; attempts++) {
    const board = (config.tuning === 'chain-v2' ? tacticalBoard : reverseBoard)(
      config,
      seededRandom(`${config.tuning ?? GENERATOR_VERSION}|${seed}|${attempts}`),
      target,
    );
    if (board.arrows.length !== target) continue;
    const solution = solve(board);
    if (!solution.solvable) continue;
    if (!best || quality(solution, target) > quality(best.solution, target))
      best = { board, solution };
    const blockedFraction = 1 - solution.initialMoves / target;
    if (
      target < 4 ||
      (blockedFraction >=
        (config.tuning ? 0.55 + config.complexity * 0.25 : 0.2 + config.complexity * 0.4) &&
        solution.depth >=
          (config.tuning
            ? Math.min(Math.floor(target * 0.5), 4 + Math.floor(config.complexity * 8))
            : Math.min(5, 2 + Math.floor(config.complexity * 3))))
    ) {
      attempts++;
      break;
    }
  }
  if (!best) {
    const board = fallbackBoard(config, target, seededRandom(`${seed}|fallback`));
    best = { board, solution: solve(board) };
    if (!best.solution.solvable) throw new Error('Error interno: fallback no solucionable.');
    return {
      ...best,
      seed,
      config: { ...config },
      version: GENERATOR_VERSION,
      attempts,
      fallback: true,
    };
  }
  return {
    ...best,
    seed,
    config: { ...config },
    version: GENERATOR_VERSION,
    attempts,
    fallback: false,
  };
}
