import { describe, expect, it, vi } from 'vitest';
import { buildChallengeUrl, createChallenge, decodeChallenge, encodeChallenge, readChallengeUrl } from '../src/services/challenges';
import { ShareService } from '../src/services/share';
import { configForLevel } from '../src/generator/config';
import { generateLevel } from '../src/generator/generator';

describe('portable challenge links', () => {
  it('round-trips Unicode seeds, independent parameters and a nested public base URL', () => {
    const spec = createChallenge(' viernes · café → ', { width: 7, height: 5, density: 0.72, complexity: 0.83 });
    const code = encodeChallenge(spec);
    expect(decodeChallenge(code)).toEqual(spec);
    const url = buildChallengeUrl('https://game.example/flecha/index.html?old=1#old', spec);
    expect(url).toContain('/flecha/index.html#reto=FT1.');
    expect(url).not.toContain('old');
    expect(readChallengeUrl(url)).toEqual({ challenge: spec, error: null });
    expect(readChallengeUrl('https://game.example/')).toEqual({ challenge: null, error: null });
  });

  it('reconstructs exactly the same boards for many seeds and configurations', () => {
    for (let index = 1; index <= 30; index++) {
      const original = createChallenge(`friends-${index}`, configForLevel(index * 4));
      const restored = readChallengeUrl(buildChallengeUrl('https://game.example/', original)).challenge!;
      expect(generateLevel(restored.seed, restored.config).board).toEqual(generateLevel(original.seed, original.config).board);
    }
  });

  it('rejects altered, oversized, empty or unsupported payloads', () => {
    const code = encodeChallenge(createChallenge('friends', configForLevel(1)));
    expect(() => decodeChallenge(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'))).toThrow('dañado');
    expect(() => decodeChallenge(code.replace('FT1.', 'FT2.'))).toThrow();
    expect(() => decodeChallenge('x'.repeat(2049))).toThrow();
    expect(() => createChallenge('', configForLevel(1))).toThrow();
    expect(() => createChallenge('a\nb', configForLevel(1))).toThrow();
    expect(() => buildChallengeUrl('javascript:alert(1)', createChallenge('a', configForLevel(1)))).toThrow();
    expect(readChallengeUrl('https://game.example/#reto=bad').error).toBeTruthy();
  });
});

describe('real sharing outcomes', () => {
  it('uses Web Share when supported and does not also copy', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const service = new ShareService({ share, clipboard: { writeText } });
    expect(await service.share({ title: 'Reto', url: 'https://game.example/' })).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to copying text and a link, but reports a denied clipboard honestly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const service = new ShareService({ canShare: () => false, clipboard: { writeText } });
    expect(await service.share({ text: 'Tiempo: 00:12', url: 'https://game.example/' })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Tiempo: 00:12\nhttps://game.example/');
    expect(await new ShareService({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } }).copy('x')).toBe('manual');
    expect(await new ShareService({}).copy('x')).toBe('manual');
  });

  it('respects cancellation and handles an unavailable native sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const cancelled = new ShareService({ share: vi.fn().mockRejectedValue({ name: 'AbortError' }), clipboard: { writeText } });
    expect(await cancelled.share({ text: 'a' })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
    const denied = new ShareService({ share: vi.fn().mockRejectedValue(new Error('unsupported')), clipboard: { writeText } });
    expect(await denied.share({ text: 'a' })).toBe('copied');
  });
});
