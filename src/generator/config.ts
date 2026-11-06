export const GENERATOR_VERSION = 'inverse-v1';

export interface LevelConfig {
  readonly width: number;
  readonly height: number;
  readonly density: number;
  readonly complexity: number;
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
    config.complexity <= 1
  );
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
