import { assertBoard } from '../core/board';
import type { Arrow, Board } from '../core/types';

export interface Solution {
  readonly solvable: boolean;
  readonly sequence: readonly string[];
  readonly remaining: readonly string[];
  readonly dependencies: number;
  readonly initialMoves: number;
  readonly depth: number;
}

/** Independent geometric predicate: does not call core.findBlocker or generator code. */
function obstructs(arrow: Arrow, other: Arrow): boolean {
  switch (arrow.direction) {
    case 'up':
      return other.x === arrow.x && other.y < arrow.y;
    case 'down':
      return other.x === arrow.x && other.y > arrow.y;
    case 'left':
      return other.y === arrow.y && other.x < arrow.x;
    case 'right':
      return other.y === arrow.y && other.x > arrow.x;
  }
}

/** Kahn topological elimination. Removing a legal arrow can only remove dependencies. */
export function solve(board: Board): Solution {
  assertBoard(board);
  const count = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  const depth = new Map<string, number>();
  let dependencies = 0;
  for (const arrow of board.arrows) {
    const blockers = board.arrows.filter((other) => obstructs(arrow, other));
    count.set(arrow.id, blockers.length);
    depth.set(arrow.id, 1);
    dependencies += blockers.length;
    for (const blocker of blockers) {
      const list = dependents.get(blocker.id) ?? [];
      list.push(arrow.id);
      dependents.set(blocker.id, list);
    }
  }
  const queue = board.arrows.filter((arrow) => count.get(arrow.id) === 0).map((arrow) => arrow.id);
  const initialMoves = queue.length;
  const sequence: string[] = [];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index]!;
    sequence.push(id);
    for (const next of dependents.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 1, (depth.get(id) ?? 1) + 1));
      const remaining = (count.get(next) ?? 1) - 1;
      count.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  return {
    solvable: sequence.length === board.arrows.length,
    sequence,
    remaining: board.arrows
      .filter((arrow) => (count.get(arrow.id) ?? 0) > 0)
      .map((arrow) => arrow.id),
    dependencies,
    initialMoves,
    depth: Math.max(0, ...depth.values()),
  };
}
