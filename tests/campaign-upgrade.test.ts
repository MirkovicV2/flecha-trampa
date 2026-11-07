import { describe, expect, it } from 'vitest';
import { createGame, attemptMove } from '../src/core/game';
import { availableMoves } from '../src/core/board';
import type { Board } from '../src/core/types';
import { powerForLevel, specialArrowTargets } from '../src/core/special-arrow';
import { classicConfigForLevel } from '../src/generator/config';
import { newSession, advanceEndlessSession } from '../src/services/session';
import { arrivalInterval, tickSurvival, keepSurvivalPlaying } from '../src/services/survival';
import { isSavedSession, decodeProfile } from '../src/services/save-validation';
import { ProgressStore } from '../src/services/progress';
import { campaignMap } from '../src/ui/campaign-map';

describe('campaign refresh', () => {
  const board: Board = {
    width: 5,
    height: 5,
    arrows: [
      { id: 'source', x: 2, y: 0, direction: 'up' },
      { id: 'same', x: 2, y: 1, direction: 'up' },
      { id: 'near', x: 1, y: 1, direction: 'left' },
      { id: 'far', x: 4, y: 0, direction: 'right' },
      { id: 'column', x: 2, y: 4, direction: 'down' },
    ],
  };

  it('keeps the original pulse and distinguishes ray and nova without altering geometry', () => {
    const source = board.arrows[0]!;
    expect(specialArrowTargets(board, source).map((a) => a.id)).toEqual(['same']);
    expect(specialArrowTargets(board, source, 'ray').map((a) => a.id)).toEqual([
      'same',
      'far',
      'column',
    ]);
    expect(specialArrowTargets(board, source, 'nova').map((a) => a.id)).toEqual(['same', 'near']);
    for (const kind of ['pulse', 'ray', 'nova'] as const) {
      const result = attemptMove(createGame(board), 'source', 'source', kind);
      expect(result.kind).toBe('removed');
      expect(result.state.moves).toBe(1 + specialArrowTargets(board, source, kind).length);
      expect(result.state.lives).toBe(3);
      expect(board.arrows).toHaveLength(5);
    }
    const blocked = attemptMove(createGame(board), 'same', 'same', 'ray');
    expect(blocked.kind).toBe('blocked');
    expect(blocked.state.board.arrows).toHaveLength(5);
  });

  it('gives every effect once per three levels, reproducibly, with varied order', () => {
    const orders = new Set<string>();
    for (let block = 0; block < 30; block++) {
      const powers = [1, 2, 3].map((offset) =>
        powerForLevel('saved-run', block * 3 + offset, () => board),
      );
      expect(new Set(powers).size).toBe(3);
      expect(powers).toEqual(
        [1, 2, 3].map((offset) => powerForLevel('saved-run', block * 3 + offset, () => board)),
      );
      orders.add(powers.join(','));
    }
    expect(orders.size).toBeGreaterThan(3);
  });

  it('round-trips new effects and accepts old pulse saves without granting another spent power', () => {
    const data = new Map<string, string>();
    const store = new ProgressStore({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
    });
    const session = newSession('classic', 1, 'classic:saved-run:1', classicConfigForLevel(1));
    expect(store.beginSession(session)).toBe(true);
    session.powerKind = 'nova';
    expect(store.flush()).toBe(true);
    const restored = decodeProfile(JSON.stringify(store.profile))!;
    expect(restored.classicSave?.powerKind).toBe('nova');
    expect(restored.powerTutorialsSeen).toBeUndefined();
    store.profile.powerTutorialsSeen = ['nova'];
    expect(decodeProfile(JSON.stringify(store.profile))?.powerTutorialsSeen).toEqual(['nova']);
    expect(
      decodeProfile(JSON.stringify({ ...store.profile, powerTutorialsSeen: ['invalid'] })),
    ).toBeNull();
    delete session.powerKind;
    expect(isSavedSession(session)).toBe(true);
    session.powerArrowId = null;
    expect(decodeProfile(JSON.stringify(store.profile))?.classicSave?.powerArrowId).toBeNull();
    expect(isSavedSession({ ...session, powerKind: 'invalid' })).toBe(false);
  });

  it('renders legacy completion from level alone, keeps numbers and blocks replay', () => {
    const store = new ProgressStore({ getItem: () => null, setItem: () => {} });
    store.profile.level = 13;
    const completed = campaignMap(store.profile, 1, 12);
    expect(completed).toContain('Nivel 12. Completado');
    expect(completed).toContain('<strong>12</strong>');
    expect(completed).not.toContain('data-action="map-play"');
    expect(campaignMap(store.profile, 1, 14)).toContain('Bloqueado');
    expect(campaignMap(store.profile, 1, 13)).toContain('data-action="map-play"');
    expect(campaignMap(store.profile, 9999, null).match(/class="map-node /g)).toHaveLength(10);
  });
});

describe('active-time survival cadence', () => {
  it('accelerates even within the same wave and approaches a safe floor for long runs', () => {
    const intervals = [0, 30000, 60000, 150000, 600000, 3600000].map((time) =>
      arrivalInterval(1, time),
    );
    expect(intervals[0]).toBe(5000);
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeLessThan(intervals[i - 1]!);
    expect(intervals.every((value) => value >= 2200 && value <= 5000)).toBe(true);
    expect(arrivalInterval(100, 60000)).toBe(arrivalInterval(1, 60000));
    expect(arrivalInterval(1, -1)).toBe(5000);
  });

  it('reproduces arrivals after reload through ten active minutes and wave changes', () => {
    let session = newSession('endless', 1, 'cadence-test', classicConfigForLevel(1));
    let arrivals = 0;
    for (let time = 0; time < 600000; time += 250) {
      session.elapsedMs += 250;
      const copy = JSON.parse(JSON.stringify(session));
      const event = tickSurvival(session, 250);
      expect(tickSurvival(copy, 250)).toEqual(event);
      expect(copy).toEqual(session);
      arrivals += event.arrived;
      for (const arrow of availableMoves(session.state.board)) {
        session.state = attemptMove(session.state, arrow.id).state;
        keepSurvivalPlaying(session);
      }
      if (session.state.status === 'won') advanceEndlessSession(session);
      expect(isSavedSession(session, 'endless')).toBe(true);
      if (time % 10000 === 0) session = JSON.parse(JSON.stringify(session));
    }
    expect(session.level).toBeGreaterThan(5);
    expect(arrivals).toBeGreaterThan(100);
    expect(session.state.lives).toBe(3);
    expect(session.survival!.arrivalInMs).toBeLessThan(3000);
  });
});
