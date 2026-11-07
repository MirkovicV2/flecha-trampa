import { GENERATOR_VERSION, isLevelConfig } from '../generator/config';
import type { LevelConfig } from '../generator/config';
import { isRecord } from '../utils/validation';

export interface ChallengeSpec {
  readonly schema: 1;
  readonly generator: typeof GENERATOR_VERSION;
  readonly seed: string;
  readonly config: LevelConfig;
}

function checksum(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createChallenge(seed: string, config: LevelConfig): ChallengeSpec {
  const normalized = seed.trim();
  if (!normalized || normalized.length > 128 || /\p{Cc}/u.test(normalized))
    throw new Error('Usa una semilla de 1 a 128 caracteres, sin caracteres de control.');
  if (!isLevelConfig(config)) throw new Error('Los parámetros del reto no son válidos.');
  return {
    schema: 1,
    generator: GENERATOR_VERSION,
    seed: normalized,
    config: {
      width: config.width,
      height: config.height,
      density: config.density,
      complexity: config.complexity,
      ...(config.shape === undefined || config.shape === 'square' ? {} : { shape: config.shape }),
      ...(config.tuning === undefined ? {} : { tuning: config.tuning }),
    },
  };
}

export function encodeChallenge(spec: ChallengeSpec): string {
  if (spec.generator !== GENERATOR_VERSION || spec.schema !== 1)
    throw new Error('Versión de reto no compatible.');
  const canonical = createChallenge(spec.seed, spec.config);
  const bytes = new TextEncoder().encode(JSON.stringify(canonical));
  const payload = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  // Older apps accept unknown config fields. A new envelope makes them reject masks
  // instead of silently dropping the shape and playing a different rectangular board.
  return `${canonical.config.tuning ? 'FT3' : canonical.config.shape ? 'FT2' : 'FT1'}.${payload}.${checksum(payload)}`;
}

export function decodeChallenge(code: string): ChallengeSpec {
  if (code.length > 2048) throw new Error('El enlace del reto es demasiado largo.');
  const [version, payload, digest, extra] = code.split('.');
  if (
    (version !== 'FT1' && version !== 'FT2' && version !== 'FT3') ||
    !payload ||
    !/^[\w-]+$/.test(payload) ||
    !digest ||
    extra !== undefined ||
    checksum(payload) !== digest
  )
    throw new Error('El enlace del reto está incompleto o dañado.');
  try {
    const binary = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      !isRecord(parsed) ||
      parsed.schema !== 1 ||
      parsed.generator !== GENERATOR_VERSION ||
      typeof parsed.seed !== 'string' ||
      !isLevelConfig(parsed.config)
    )
      throw new Error('incompatible');
    const canonical = createChallenge(parsed.seed, parsed.config);
    if (version !== (canonical.config.tuning ? 'FT3' : canonical.config.shape ? 'FT2' : 'FT1'))
      throw new Error('incompatible');
    return canonical;
  } catch {
    throw new Error('Este reto utiliza datos o una versión del generador no compatibles.');
  }
}

export function buildChallengeUrl(base: string, spec: ChallengeSpec): string {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Configura una URL pública HTTP o HTTPS válida.');
  url.search = '';
  url.hash = new URLSearchParams({ reto: encodeChallenge(spec) }).toString();
  return url.toString();
}

export function readChallengeUrl(url: string): {
  challenge: ChallengeSpec | null;
  error: string | null;
} {
  try {
    const code = new URLSearchParams(new URL(url).hash.slice(1)).get('reto');
    return { challenge: code ? decodeChallenge(code) : null, error: null };
  } catch (error) {
    return { challenge: null, error: error instanceof Error ? error.message : 'Enlace no válido.' };
  }
}
