import { describe, expect, it, vi, afterEach } from 'vitest';
import type { Board } from '../src/core/types';
import { powerForLevel, selectPowerArrow, createPowerSequence } from '../src/core/special-arrow';
import { generateLevel } from '../src/generator/generator';
import * as generator from '../src/generator/generator';
import { classicConfigForLevel } from '../src/generator/config';
import { newSession } from '../src/services/session';
import { isSavedSession } from '../src/services/save-validation';
import { gameScreen } from '../src/ui/game-screen';

const runId = 'classic:qa-eligibility-0';
const sessionAt = (level: number) =>
  newSession('classic', level, `${runId}:${level}`, classicConfigForLevel(level));
const canonicalBoard = (level: number) =>
  generateLevel(`${runId}:${level}`, classicConfigForLevel(level)).board;

describe('eligible power bag', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Evict the disposable campaign cache as a real process reload would.
    newSession('classic', 1, 'classic:other-campaign:1', classicConfigForLevel(1));
  });
  it('reproduces the exact QA seed: level 1 skips and levels 2–4 exhaust one bag', () => {
    // QA's no-target board fixture, with the exact reported campaign seed.
    const originalGenerate = generateLevel;
    const mock = vi.spyOn(generator, 'generateLevel').mockImplementation((seed, config) => {
      const generated = originalGenerate(seed, config);
      return seed === `${runId}:1`
        ? {
            ...generated,
            board: { ...generated.board, arrows: generated.board.arrows.slice(0, 1) },
          }
        : generated;
    });
    expect(selectPowerArrow(canonicalBoard(1), 1, 'ray')).toBeNull();
    const first = sessionAt(1);
    expect(first.powerArrowId).toBeNull();
    expect(first.powerKind).toBeUndefined();
    expect(gameScreen(first, 0)).not.toContain('power-arrow-note');
    const sparse = newSession('classic', 1, `${runId}:1`, {
      width: 1,
      height: 1,
      density: 1,
      complexity: 0,
    });
    expect(isSavedSession(JSON.parse(JSON.stringify(sparse)))).toBe(true);
    const sessions = [2, 3, 4].map(sessionAt);
    expect(sessions.every((session) => session.powerArrowId)).toBe(true);
    expect(sessions.map((session) => session.powerKind)).toEqual(['ray', 'pulse', 'nova']);
    expect(sessions.map((session) => session.powerKind).sort()).toEqual(['nova', 'pulse', 'ray']);
    for (const session of sessions) {
      expect(session.powerKind).toBe(powerForLevel(runId, session.level, canonicalBoard));
    }
    mock.mockRestore();
  });

  it('skips interleaved incompatible boards through consecutive complete cycles', () => {
    const empty: Board = {
      width: 4,
      height: 4,
      arrows: [{ id: 'alone', x: 0, y: 0, direction: 'up' }],
    };
    const eligible: Board = {
      width: 4,
      height: 4,
      arrows: [
        { id: 'a', x: 0, y: 0, direction: 'up' },
        { id: 'b', x: 0, y: 1, direction: 'up' },
      ],
    };
    const boards = (level: number) => (level % 2 ? empty : eligible);
    const cached = createPowerSequence(runId, boards);
    const kinds = [];
    for (let level = 1; level <= 36; level++) {
      const kind = powerForLevel(runId, level, boards);
      if (level % 2) expect(kind).toBeNull();
      else kinds.push(kind);
    }
    for (let offset = 0; offset < kinds.length; offset += 3) {
      expect(kinds.slice(offset, offset + 3).sort()).toEqual(['nova', 'pulse', 'ray']);
    }
    // Reverse/random access reconstructs the same prefix, without consuming a draw.
    for (const level of [36, 2, 18, 4, 36, 1, 34, 6]) {
      expect(powerForLevel(runId, level, boards)).toBe(level % 2 ? null : kinds[level / 2 - 1]);
      expect(cached(level)).toBe(powerForLevel(runId, level, boards));
      expect(createPowerSequence(runId, boards)(level)).toBe(cached(level));
    }
    // A board with a valid Pulso but no Rayo cannot reroll the first Rayo draw.
    const pulseOnly: Board = {
      ...eligible,
      arrows: [eligible.arrows[0]!, { id: 'diagonal', x: 1, y: 1, direction: 'up' }],
    };
    expect(selectPowerArrow(pulseOnly, 1, 'pulse')).not.toBeNull();
    expect(powerForLevel(runId, 1, () => pulseOnly)).toBeNull();
    expect(powerForLevel(runId, 2, (level) => (level === 1 ? pulseOnly : eligible))).toBe('ray');
  });

  it('keeps assignment and source across retry, reload, load order and spent saves', () => {
    const baseline = [1, 2, 3, 4, 5, 6, 7].map(sessionAt);
    for (const level of [7, 1, 4, 2, 6, 3, 5, 4]) {
      const retry = sessionAt(level);
      const original = baseline[level - 1]!;
      expect([retry.powerKind, retry.powerArrowId, retry.initialBoard]).toEqual([
        original.powerKind,
        original.powerArrowId,
        original.initialBoard,
      ]);
      const reload = JSON.parse(JSON.stringify(original));
      expect(isSavedSession(reload)).toBe(true);
      expect(reload.powerArrowId).toBe(original.powerArrowId);
      reload.powerArrowId = null;
      expect(isSavedSession(reload)).toBe(true);
      expect(JSON.parse(JSON.stringify(reload)).powerArrowId).toBeNull();
    }
    expect(isSavedSession({ ...baseline[0], powerPolicy: 'invalid' })).toBe(false);
    const legacy = { ...baseline[1] };
    delete legacy.powerPolicy;
    delete legacy.powerKind;
    expect(isSavedSession(legacy)).toBe(true);
  });
});
