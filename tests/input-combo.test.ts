import { describe, expect, it } from 'vitest';
import { advanceCombo, COMBO_WINDOW_MS, emptyCombo } from '../src/core/combo';
import { isTap } from '../src/ui/board-input';

describe('touch gesture intent', () => {
  const start = { x: 10, y: 20, at: 1000 };
  it('accepts finger jitter but rejects scrolling, long presses and invalid ordering', () => {
    expect(isTap(start, { x: 16, y: 26, at: 1120 })).toBe(true);
    expect(isTap(start, { x: 30, y: 21, at: 1120 })).toBe(false);
    expect(isTap(start, { x: 10, y: 20, at: 1800 })).toBe(false);
    expect(isTap(start, { x: 10, y: 20, at: 900 })).toBe(false);
  });
});

describe('combo timing', () => {
  it('chains fast valid moves, breaks on errors and retains the best streak', () => {
    let state = advanceCombo(emptyCombo(), true, 100);
    state = advanceCombo(state, true, 300);
    expect(state).toMatchObject({ count: 2, best: 2 });
    state = advanceCombo(state, false, 350);
    expect(state).toMatchObject({ count: 0, best: 2 });
    expect(advanceCombo(state, true, 400)).toMatchObject({ count: 1, best: 2 });
  });
  it('starts again after expiry or a backwards clock', () => {
    const state = advanceCombo(emptyCombo(), true, 100);
    expect(advanceCombo(state, true, 101 + COMBO_WINDOW_MS).count).toBe(1);
    expect(advanceCombo(state, true, 50).count).toBe(1);
  });
});
