/** Finite feedback on the claimed card. It never covers controls or changes inventory. */
export function rewardClaimMotion(
  root: HTMLElement,
  tier: number,
  track: 'free' | 'premium',
  reduced: boolean,
): void {
  const card = root.querySelector<HTMLElement>(`[data-pass-tier="${tier}"] .pass-track.${track}`);
  if (!card || reduced) return;
  const animation = card.animate(
    [
      { outline: '2px solid #ffe0a3', boxShadow: '0 0 32px #e9b96a66', transform: 'scale(.97)' },
      {
        outline: '2px solid #e9b96a99',
        boxShadow: '0 0 12px #e9b96a22',
        transform: 'scale(1.025)',
        offset: 0.4,
      },
      { outline: '2px solid transparent', boxShadow: '0 0 0 transparent', transform: 'scale(1)' },
    ],
    { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' },
  );
  void animation.finished.then(
    () => animation.cancel(),
    () => undefined,
  );
}
