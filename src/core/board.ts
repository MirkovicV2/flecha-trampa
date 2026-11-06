import { DIRECTIONS, VECTORS } from './types';
import type { Arrow, Board } from './types';

/** Validate untrusted saves and URLs at the boundary; the core never fixes bad data silently. */
export function isBoard(value: unknown): value is Board {
  if (!value || typeof value !== 'object') return false;
  const board = value as Partial<Board>;
  if (!Number.isInteger(board.width) || !Number.isInteger(board.height)) return false;
  if (!board.width || !board.height || board.width < 1 || board.height < 1 || board.width > 10 || board.height > 10) return false;
  if (!Array.isArray(board.arrows) || board.arrows.length > board.width * board.height) return false;
  const ids = new Set<string>();
  const cells = new Set<string>();
  for (const candidate of board.arrows as unknown[]) {
    if (!candidate || typeof candidate !== 'object') return false;
    const arrow = candidate as Partial<Arrow>;
    if (typeof arrow.id !== 'string' || arrow.id.length < 1 || arrow.id.length > 64 || ids.has(arrow.id)) return false;
    if (!Number.isInteger(arrow.x) || !Number.isInteger(arrow.y) || arrow.x === undefined || arrow.y === undefined) return false;
    if (arrow.x < 0 || arrow.y < 0 || arrow.x >= board.width || arrow.y >= board.height) return false;
    if (!DIRECTIONS.includes(arrow.direction as Arrow['direction'])) return false;
    const cell = `${arrow.x},${arrow.y}`;
    if (cells.has(cell)) return false;
    cells.add(cell);
    ids.add(arrow.id);
  }
  return true;
}

export function assertBoard(value: unknown): asserts value is Board {
  if (!isBoard(value)) throw new Error('Tablero inválido: dimensiones, identificadores o celdas incorrectos.');
}

export function findBlocker(board: Board, arrow: Arrow): Arrow | null {
  const [dx, dy] = VECTORS[arrow.direction];
  const occupancy = new Map(board.arrows.map((item) => [`${item.x},${item.y}`, item]));
  for (let x = arrow.x + dx, y = arrow.y + dy; x >= 0 && y >= 0 && x < board.width && y < board.height; x += dx, y += dy) {
    const blocker = occupancy.get(`${x},${y}`);
    if (blocker) return blocker;
  }
  return null;
}

export function availableMoves(board: Board): readonly Arrow[] {
  return board.arrows.filter((arrow) => findBlocker(board, arrow) === null);
}
