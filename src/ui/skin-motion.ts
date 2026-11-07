import { ARROW_DESIGNS } from '../config/arrow-designs';
import type { SkinId } from '../config/collection';

/** Inspector motion has a finite lifetime and never touches the actual board or inventory. */
export class SkinMotionPreview {
  private animations: Animation[] = [];
  private stage: HTMLElement | null = null;
  private generation = 0;

  clear(): void {
    this.generation++;
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
    this.stage?.querySelectorAll('.inspector-particle').forEach((particle) => particle.remove());
    this.stage?.removeAttribute('data-previewing');
    this.stage = null;
  }

  play(root: HTMLElement, skin: SkinId, reduced: boolean): void {
    this.clear();
    const generation = this.generation;
    const stage = root.querySelector<HTMLElement>('[data-inspector-stage]');
    const glyph = stage?.querySelector<HTMLElement>('.inspector-glyph');
    if (!stage || !glyph) return;
    this.stage = stage;
    const style = ARROW_DESIGNS[skin].exit;
    stage.dataset.previewing = style;
    const animate = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(frames, options);
      this.animations.push(animation);
      return animation;
    };
    const main = animate(
      glyph,
      reduced
        ? [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }]
        : [
            { transform: 'translateY(0) scale(1)', opacity: 1 },
            { transform: 'translateY(10px) scale(.96, 1.04)', opacity: 1, offset: 0.16 },
            { transform: 'translateY(-190px) scale(.9, 1.12)', opacity: 0, offset: 0.62 },
            { transform: 'translateY(32px) scale(.96)', opacity: 0, offset: 0.75 },
            { transform: 'translateY(0) scale(1)', opacity: 1 },
          ],
      {
        duration: reduced ? 180 : style === 'pixel' ? 850 : 1150,
        easing: style === 'pixel' ? 'steps(12, end)' : 'cubic-bezier(.23,.7,.3,1)',
      },
    );
    if (!reduced) {
      const count =
        style === 'sonar'
          ? 3
          : style === 'ribbon'
            ? 5
            : style === 'orbit' || style === 'precision'
              ? 6
              : 14;
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('i');
        particle.className = `inspector-particle particle-${style}`;
        stage.append(particle);
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * (style === 'orbit' ? 95 : 45 + (i % 4) * 17);
        const y = Math.sin(angle) * 65 + (style === 'nova' ? 55 : style === 'flame' ? -75 : 0);
        const ring = style === 'sonar' || style === 'orbit';
        const end =
          style === 'glitch'
            ? `translate(${(i % 2 ? -1 : 1) * 85}px, ${(i - count / 2) * 12}px) scaleX(3)`
            : ring
              ? `translate(-50%, -50%) scale(${3 + i * 2})`
              : `translate(${x}px, ${y}px) rotate(${i * 49}deg) scale(${style === 'ribbon' ? 2 : 0.4})`;
        animate(
          particle,
          [
            { transform: 'translate(0, 0) scale(.3)', opacity: 0 },
            { opacity: 0.9, offset: 0.15 },
            {
              transform: end,
              opacity: 0,
            },
          ],
          {
            duration: style === 'petal' || style === 'ribbon' ? 850 : 650,
            delay: 170 + (i % 3) * 25,
            fill: 'both',
            easing: style === 'glitch' ? 'steps(5, end)' : 'cubic-bezier(.16,1,.3,1)',
          },
        );
      }
    }
    void main.finished.then(
      () => {
        if (this.generation === generation) this.clear();
      },
      () => undefined,
    );
  }
}
