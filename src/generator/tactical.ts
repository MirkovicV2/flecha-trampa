import { DIRECTIONS, VECTORS } from '../core/types';
import type { Arrow, Board, Direction } from '../core/types';
import type { LevelConfig } from './config';
import { containsCell, shapeCells } from './shapes';

/** Reverse insertion with chain pressure. A new arrow always has a clear ray.
 * Every edge points from an older arrow to a newer one: a cycle is impossible.
 * The independent solver still validates each candidate before it can be used.
 */
export function tacticalBoard(config: LevelConfig, random: () => number, target: number): Board {
  const { width, height, complexity } = config;
  const arrows: Arrow[] = [];
  const occupied = new Set<number>();
  const rank: number[] = [];
  const cells = shapeCells(width, height, config.shape);
  const holeBudget = cells.length - target;
  for (let index = 0; index < target; index++) {
    const pressure = new Float64Array(width * height);
    const chain = new Uint16Array(width * height);
    for (let i = 0; i < arrows.length; i++) {
      const a = arrows[i]!;
      const [dx, dy] = VECTORS[a.direction];
      for (
        let x = a.x + dx, y = a.y + dy;
        x >= 0 && y >= 0 && x < width && y < height;
        x += dx, y += dy
      ) {
        const cell = y * width + x;
        pressure[cell] = pressure[cell]! + 1;
        chain[cell] = Math.max(chain[cell]!, rank[i]!);
      }
    }
    const rowMin = new Array<number>(height).fill(width);
    const rowMax = new Array<number>(height).fill(-1);
    const colMin = new Array<number>(width).fill(height);
    const colMax = new Array<number>(width).fill(-1);
    for (const a of arrows) {
      rowMin[a.y] = Math.min(rowMin[a.y]!, a.x);
      rowMax[a.y] = Math.max(rowMax[a.y]!, a.x);
      colMin[a.x] = Math.min(colMin[a.x]!, a.y);
      colMax[a.x] = Math.max(colMax[a.x]!, a.y);
    }
    let best: { x: number; y: number; direction: Direction; score: number; rank: number } | null =
      null;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const cell = y * width + x;
        if (occupied.has(cell) || !containsCell(width, height, config.shape ?? 'square', x, y))
          continue;
        // Preserve enough open insertion positions to reach the requested density.
        let trapped = 0;
        for (const c of cells) {
          if ((c.x === x && c.y === y) || occupied.has(c.y * width + c.x)) continue;
          const minX = c.y === y ? Math.min(rowMin[c.y]!, x) : rowMin[c.y]!;
          const maxX = c.y === y ? Math.max(rowMax[c.y]!, x) : rowMax[c.y]!;
          const minY = c.x === x ? Math.min(colMin[c.x]!, y) : colMin[c.x]!;
          const maxY = c.x === x ? Math.max(colMax[c.x]!, y) : colMax[c.x]!;
          if (c.x > minX && c.x < maxX && c.y > minY && c.y < maxY) trapped++;
          if (trapped > holeBudget) break;
        }
        if (trapped > holeBudget) continue;
        for (const direction of DIRECTIONS) {
          const [dx, dy] = VECTORS[direction];
          let clear = true,
            future = 0;
          for (
            let xx = x + dx, yy = y + dy;
            xx >= 0 && yy >= 0 && xx < width && yy < height;
            xx += dx, yy += dy
          ) {
            if (occupied.has(yy * width + xx)) {
              clear = false;
              break;
            }
            if (containsCell(width, height, config.shape ?? 'square', xx, yy)) future++;
          }
          if (!clear) continue;
          // Prefer extending the longest dependency chain. A long free ray leaves
          // room for later blockers instead of filling the rim with immediate exits.
          const score =
            chain[cell]! * (0.8 + complexity * 2.4) +
            pressure[cell]! * (0.4 + complexity) +
            future * (0.45 + complexity * 0.5) +
            random() * (2.4 - complexity);
          if (!best || score > best.score)
            best = { x, y, direction, score, rank: chain[cell]! + 1 };
        }
      }
    if (!best) break;
    arrows.push({ id: `a${index}`, x: best.x, y: best.y, direction: best.direction });
    rank.push(best.rank);
    occupied.add(best.y * width + best.x);
  }
  return { width, height, arrows };
}
