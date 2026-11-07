import type { Arrow, Board } from './types';
import { seededRandom } from '../utils/random';

export type PowerKind = 'pulse' | 'ray' | 'nova';
export const POWER_INFO = {
  pulse: {
    name: 'Pulso',
    symbol: '✦',
    color: '#ffda87',
    description: 'Libera hasta 2 cercanas de igual dirección.',
  },
  ray: {
    name: 'Rayo',
    symbol: '↔',
    color: '#9cddff',
    description: 'Libera hasta 3 de su fila o columna.',
  },
  nova: {
    name: 'Nova',
    symbol: '✳',
    color: '#e0b4ff',
    description: 'Libera hasta 3 vecinas, en cualquier dirección.',
  },
} as const;

/** Position is counted only when the next effect has targets on the original board. */
function powerAtPosition(runId: string, position: number): PowerKind {
  const bag: PowerKind[] = ['pulse', 'ray', 'nova'];
  const random = seededRandom(`powers:${runId}:${Math.floor(position / 3)}`);
  for (let index = bag.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [bag[index], bag[other]] = [bag[other]!, bag[index]!];
  }
  return bag[position % 3]!;
}

/** Replay the canonical campaign prefix, never visit order or mutable/spent boards.
 * An incompatible board waits for the same effect; it cannot reroll the bag.
 */
export function powerForLevel(
  runId: string,
  level: number,
  boardForLevel: (level: number) => Board,
): PowerKind | null {
  return createPowerSequence(runId, boardForLevel)(level);
}

/** Memoized canonical prefix: requesting a late level still computes every predecessor.
 * Cache contents are derived only from seeds, never from the order of requests.
 */
export function createPowerSequence(runId: string, boardForLevel: (level: number) => Board) {
  const deals: (PowerKind | null)[] = [];
  let position = 0;
  return (level: number): PowerKind | null => {
    if (!Number.isSafeInteger(level) || level < 1) return null;
    while (deals.length < level) {
      const current = deals.length + 1;
      const kind = powerAtPosition(runId, position);
      const eligible = selectPowerArrow(boardForLevel(current), current, kind) !== null;
      deals.push(eligible ? kind : null);
      if (eligible) position++;
    }
    return deals[level - 1]!;
  };
}

const INTRO_LEVEL = 1;
const CLEAR_RADIUS = 2;
const CLEAR_LIMIT = 2;

const distance = (first: Arrow, second: Arrow): number =>
  Math.abs(first.x - second.x) + Math.abs(first.y - second.y);

const positionOrder = (first: Arrow, second: Arrow): number =>
  first.y - second.y ||
  first.x - second.x ||
  (first.id < second.id ? -1 : first.id > second.id ? 1 : 0);

/** Removing pieces cannot create a new blocker, so the generated solution remains valid. */
export function specialArrowTargets(
  board: Board,
  source: Arrow,
  kind: PowerKind = 'pulse',
): readonly Arrow[] {
  return board.arrows
    .filter(
      (arrow) =>
        arrow.id !== source.id &&
        (kind === 'ray'
          ? arrow.x === source.x || arrow.y === source.y
          : kind === 'nova'
            ? Math.max(Math.abs(source.x - arrow.x), Math.abs(source.y - arrow.y)) <= 1
            : arrow.direction === source.direction && distance(source, arrow) <= CLEAR_RADIUS),
    )
    .sort(
      (first, second) =>
        distance(source, first) - distance(source, second) || positionOrder(first, second),
    )
    .slice(0, kind === 'pulse' ? CLEAR_LIMIT : 3);
}

/** One original piece is marked; boards and seeds themselves are never changed. */
export function selectPowerArrow(
  board: Board,
  level: number,
  kind: PowerKind = 'pulse',
): string | null {
  if (!Number.isInteger(level) || level < INTRO_LEVEL) return null;
  const candidates = [...board.arrows]
    .filter((arrow) => specialArrowTargets(board, arrow, kind).length > 0)
    .sort(
      (first, second) =>
        specialArrowTargets(board, second, kind).length -
          specialArrowTargets(board, first, kind).length || positionOrder(first, second),
    );
  return candidates[0]?.id ?? null;
}
