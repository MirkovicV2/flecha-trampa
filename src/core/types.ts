export const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export interface Arrow {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly direction: Direction;
}

export interface Board {
  readonly width: number;
  readonly height: number;
  readonly arrows: readonly Arrow[];
}

export type GameStatus = 'playing' | 'won' | 'lost';
export interface GameState {
  readonly board: Board;
  readonly lives: number;
  readonly errors: number;
  readonly moves: number;
  readonly totalArrows: number;
  readonly status: GameStatus;
}

export interface MoveResult {
  readonly kind: 'removed' | 'blocked' | 'ignored';
  readonly state: GameState;
  readonly arrow: Arrow | null;
  readonly blocker: Arrow | null;
}

export const VECTORS: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};
