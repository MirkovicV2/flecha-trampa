export const ENERGY_CAPACITY = 5;
export const PREMIUM_ENERGY_CAPACITY = 8;
export const ENERGY_REFILL_MS = 10 * 60 * 1000;
export interface EnergyState {
  amount: number;
  updatedAt: number;
}

export function defaultEnergy(now = Date.now()): EnergyState {
  return { amount: ENERGY_CAPACITY, updatedAt: now };
}

/** Offline wall-clock regeneration; backwards clock changes never grant charges. */
export function regenerateEnergy(
  state: EnergyState,
  now: number,
  capacity = ENERGY_CAPACITY,
): EnergyState {
  if (!Number.isFinite(now) || now < state.updatedAt || state.amount >= capacity) return state;
  const ticks = Math.floor((now - state.updatedAt) / ENERGY_REFILL_MS);
  if (ticks < 1) return state;
  const amount = Math.min(capacity, state.amount + ticks);
  return {
    amount,
    updatedAt: amount === capacity ? now : state.updatedAt + ticks * ENERGY_REFILL_MS,
  };
}

export function spendEnergy(
  state: EnergyState,
  now: number,
  capacity = ENERGY_CAPACITY,
): EnergyState | null {
  const current = regenerateEnergy(state, now, capacity);
  if (current.amount < 1) return null;
  return {
    amount: current.amount - 1,
    updatedAt: current.amount >= capacity ? Math.max(now, current.updatedAt) : current.updatedAt,
  };
}

export function energyWaitMs(state: EnergyState, now: number, capacity = ENERGY_CAPACITY): number {
  const current = regenerateEnergy(state, now, capacity);
  if (current.amount >= capacity) return 0;
  return Math.max(0, current.updatedAt + ENERGY_REFILL_MS - now);
}
