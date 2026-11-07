export const COMBO_WINDOW_MS = 1800;
export interface ComboState {
  readonly count: number;
  readonly best: number;
  readonly lastMoveAt: number;
}
export const emptyCombo = (): ComboState => ({ count: 0, best: 0, lastMoveAt: 0 });

/** Presentation streak only: a combo never changes which arrows are legal. */
export function advanceCombo(state: ComboState, removed: boolean, now: number): ComboState {
  if (!removed) return { ...state, count: 0, lastMoveAt: 0 };
  const count =
    state.count > 0 && now >= state.lastMoveAt && now - state.lastMoveAt <= COMBO_WINDOW_MS
      ? state.count + 1
      : 1;
  return { count, best: Math.max(state.best, count), lastMoveAt: now };
}
