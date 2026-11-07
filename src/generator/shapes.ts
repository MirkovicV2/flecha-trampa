/** Masks affect placement, never movement: rays still cross the entire rectangle. */
export const BOARD_SHAPES = ['square', 'diamond', 'cross', 'ring', 'hourglass'] as const;
export type BoardShape = (typeof BOARD_SHAPES)[number];
export const SHAPE_LABELS: Readonly<Record<BoardShape, string>> = {
  square: 'Cuadrícula',
  diamond: 'Diamante',
  cross: 'Cruz',
  ring: 'Órbita',
  hourglass: 'Reloj de arena',
};

export function isBoardShape(value: unknown): value is BoardShape {
  return BOARD_SHAPES.includes(value as BoardShape);
}

export function containsCell(
  width: number,
  height: number,
  shape: BoardShape,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  if (Math.min(width, height) < 3) return true;
  const nx = width === 1 ? 0 : Math.abs((2 * x) / (width - 1) - 1);
  const ny = height === 1 ? 0 : Math.abs((2 * y) / (height - 1) - 1);
  if (shape === 'diamond') return nx + ny <= 1.15;
  if (shape === 'cross') return nx <= 0.4 || ny <= 0.4;
  if (shape === 'ring') return Math.max(nx, ny) >= 0.6 || Math.min(width, height) < 3;
  if (shape === 'hourglass') return nx <= Math.max(0.28, ny + 0.13);
  return true;
}

export function shapeCells(width: number, height: number, shape: BoardShape = 'square') {
  return Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
  })).filter(({ x, y }) => containsCell(width, height, shape, x, y));
}

export function arrowCount(config: {
  width: number;
  height: number;
  density: number;
  shape?: BoardShape;
}): number {
  return Math.max(
    1,
    Math.round(shapeCells(config.width, config.height, config.shape).length * config.density),
  );
}
