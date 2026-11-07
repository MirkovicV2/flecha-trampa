import { isBoardShape } from './shapes';
import type { BoardShape } from './shapes';

export const GENERATOR_VERSION = 'inverse-v1';

export interface LevelConfig {
  readonly width: number;
  readonly height: number;
  readonly density: number;
  readonly complexity: number;
  readonly shape?: BoardShape;
  /** Opt-in algorithm revision. Absence preserves all FT1/FT2 seeds exactly. */
  readonly tuning?: 'chain-v2';
}

export function isLevelConfig(value: unknown): value is LevelConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<LevelConfig>;
  return (
    Number.isInteger(config.width) &&
    Number.isInteger(config.height) &&
    typeof config.width === 'number' &&
    config.width >= 1 &&
    config.width <= 10 &&
    typeof config.height === 'number' &&
    config.height >= 1 &&
    config.height <= 10 &&
    typeof config.density === 'number' &&
    Number.isFinite(config.density) &&
    config.density >= 0.1 &&
    config.density <= 1 &&
    typeof config.complexity === 'number' &&
    Number.isFinite(config.complexity) &&
    config.complexity >= 0 &&
    config.complexity <= 1 &&
    (config.shape === undefined || isBoardShape(config.shape)) &&
    (config.tuning === undefined || config.tuning === 'chain-v2')
  );
}

/** Existing seeds/configurations remain identical. Only new classic attempts use masks. */
export function classicConfigForLevel(level: number): LevelConfig {
  const config = configForLevel(level);
  if (level === 1) return { ...config, density: 0.65, complexity: 0.55 };
  const shapes = ['diamond', 'cross', 'ring', 'hourglass', 'square'] as const;
  const shape = level === 2 ? undefined : shapes[(level - 3) % shapes.length]!;
  return {
    ...config,
    ...(shape === undefined ? {} : { shape }),
    tuning: 'chain-v2',
    density: Math.min(
      0.96,
      0.72 + Math.log2(level + 1) * 0.045 + (shape && shape !== 'square' ? 0.06 : 0),
    ),
    complexity: Math.min(1, 0.55 + Math.log2(level + 1) * 0.09),
  };
}

export function configForLevel(level: number): LevelConfig {
  if (!Number.isSafeInteger(level) || level < 1) throw new Error('Nivel inválido.');
  const size =
    level <= 2
      ? 4
      : level <= 5
        ? 5
        : level <= 15
          ? 6
          : level <= 30
            ? 7
            : level <= 60
              ? 8
              : level <= 100
                ? 9
                : 10;
  // Density and dependency preference progress separately from board dimensions.
  return {
    width: size,
    height: size,
    density: Math.min(0.82, 0.53 + Math.log2(level + 1) * 0.035),
    complexity: Math.min(0.95, 0.2 + Math.log2(level + 1) * 0.1),
  };
}
