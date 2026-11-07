export const COMBO_STAGES = [
  { from: 0, name: 'ENCUENTRA EL RITMO', tier: 'idle', color: '#d6ff89', particles: 0 },
  { from: 2, name: 'EN RACHA', tier: 'flow', color: '#d6ff89', particles: 10 },
  { from: 4, name: 'ACELERANDO', tier: 'rush', color: '#87efff', particles: 16 },
  { from: 7, name: 'FRENESÍ', tier: 'frenzy', color: '#ff9fd9', particles: 22 },
  { from: 10, name: 'IMPARABLE', tier: 'unstoppable', color: '#ffda83', particles: 28 },
  { from: 15, name: 'LEYENDA', tier: 'legend', color: '#e2b1ff', particles: 32 },
] as const;

export function comboStage(count: number): (typeof COMBO_STAGES)[number] {
  return (
    [...COMBO_STAGES].reverse().find((stage) => Number.isFinite(count) && count >= stage.from) ??
    COMBO_STAGES[0]
  );
}
