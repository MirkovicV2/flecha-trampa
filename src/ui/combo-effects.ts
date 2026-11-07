import { comboStage } from '../config/combos';
import type { PlayerSettings } from '../config/theme';

const MAX_PARTICLES = 72;

/** All motion is decorative. Board geometry and its touch targets never move. */
export class ComboEffects {
  private readonly animations = new Set<Animation>();
  private lastSurge = -Infinity;
  constructor(private readonly root: HTMLElement) {}

  clear(): void {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    this.root.querySelector('.screen-fx')?.remove();
    this.lastSurge = -Infinity;
  }

  hit(
    count: number,
    settings: PlayerSettings,
    point: { x: number; y: number },
    won = false,
    power?: { name: string; color: string },
  ): void {
    if (settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let layer = this.root.querySelector<HTMLElement>('.screen-fx');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'screen-fx';
      layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML =
        '<div class="combo-vignette"></div><div class="combo-callout"><span data-fx-word></span><strong data-fx-count></strong></div><div class="combo-speed-lines"></div><div class="combo-confetti"></div>';
      this.root.append(layer);
    }
    const stage = comboStage(count);
    const color = power?.color ?? stage.color;
    layer.style.setProperty('--combo-color', color);
    layer.dataset.tier = stage.tier;
    const board = this.root.querySelector('.board-frame')?.getBoundingClientRect();
    const callout = layer.querySelector<HTMLElement>('.combo-callout')!;
    callout.style.top = `${Math.max(105, (board?.top ?? 200) - 4)}px`;
    layer.querySelector('[data-fx-word]')!.textContent = won
      ? '¡TABLERO LIMPIO!'
      : power
        ? `¡${power.name.toUpperCase()}!`
        : stage.name;
    layer.querySelector('[data-fx-count]')!.textContent = won ? '¡BRUTAL!' : `×${count}`;
    if (count >= 2 || won || power) {
      for (const animation of callout.getAnimations()) animation.cancel();
      this.animate(
        callout,
        [
          { opacity: 0, transform: 'translate(-50%, -75%) scale(.65) rotate(-9deg)' },
          {
            opacity: 1,
            transform: 'translate(-50%, -100%) scale(1.14) rotate(-3deg)',
            offset: 0.18,
          },
          { opacity: 1, transform: 'translate(-50%, -100%) scale(1) rotate(-3deg)', offset: 0.67 },
          { opacity: 0, transform: 'translate(-50%, -120%) scale(1.06) rotate(-3deg)' },
        ],
        won ? 850 : 520,
      );
    }
    // At most two peripheral surges per second; no rapid full-screen flashes.
    if ((count >= 4 || won) && performance.now() - this.lastSurge >= 500) {
      this.lastSurge = performance.now();
      this.animate(
        layer.querySelector('.combo-vignette')!,
        [{ opacity: 0 }, { opacity: count >= 10 || won ? 0.7 : 0.4, offset: 0.15 }, { opacity: 0 }],
        480,
      );
      this.animate(
        layer.querySelector('.combo-speed-lines')!,
        [
          { opacity: 0, transform: 'scale(.85)' },
          { opacity: 0.6, offset: 0.2 },
          { opacity: 0, transform: 'scale(1.25)' },
        ],
        420,
      );
    }
    const confetti = layer.querySelector('.combo-confetti')!;
    const particles = won ? 40 : Math.max(power ? 18 : 4, stage.particles);
    while (confetti.childElementCount + particles > MAX_PARTICLES) {
      const oldest = confetti.firstElementChild;
      if (!oldest) break;
      for (const animation of oldest.getAnimations()) animation.cancel();
      oldest.remove();
    }
    for (let i = 0; i < particles; i++) {
      const spark = document.createElement('i');
      spark.className = 'combo-spark';
      const angle = (i / particles) * Math.PI * 2 + count * 0.21;
      const distance = 45 + (i % 5) * 15 + Math.min(count, 15) * 6;
      spark.style.left = `${point.x}px`;
      spark.style.top = `${point.y}px`;
      spark.style.background = i % 3 === 0 ? '#fff5d5' : color;
      confetti.append(spark);
      this.animate(
        spark,
        [
          {
            opacity: 1,
            transform: `translate(-50%, -50%) scale(${1 + (i % 3) * 0.25}) rotate(0deg)`,
          },
          {
            opacity: 0,
            transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + (won ? 130 : 35)}px) scale(.15) rotate(${120 + i * 29}deg)`,
          },
        ],
        430 + (i % 4) * 70,
        () => spark.remove(),
      );
    }
  }

  private animate(element: Element, frames: Keyframe[], duration: number, done?: () => void): void {
    const animation = element.animate(frames, {
      duration,
      easing: 'cubic-bezier(.12,.65,.25,1)',
      fill: 'none',
    });
    this.animations.add(animation);
    const release = () => {
      this.animations.delete(animation);
      done?.();
    };
    animation.onfinish = release;
    animation.oncancel = release;
  }
}
