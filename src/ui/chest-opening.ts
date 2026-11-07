import { SKINS, RARITY_LABELS } from '../config/collection';
import type { PlayerSettings } from '../config/theme';
import type { ChestDrop } from '../services/economy';
import { seededRandom } from '../utils/random';
import { arrowArt, supplyCase } from './arrow-art';
import { ARROW_DESIGNS } from '../config/arrow-designs';
import { chestContent } from './rewards';
import { icon } from './icons';
import { createChestReel, reelLanding, reelProgress, REEL_DURATION_MS } from './chest-reel';

export type ChestCue = 'unlock' | 'tick' | 'reveal';

export function chestOpeningContent(drop: ChestDrop, sound: boolean): string {
  return `<div class="case-opening rarity-${drop.rarity}" data-case-phase="sealed"><div class="case-top"><span class="studio-kicker">FT / SUMINISTRO 01</span><button class="case-sound" data-action="chest-sound" aria-pressed="${sound}" aria-label="Sonido de apertura"><span data-case-sound>${sound ? 'SONIDO ON' : 'SONIDO OFF'}</span>${icon(sound ? 'volume' : 'mute')}</button></div><div class="case-roll-area"><div class="case-title"><span class="case-edition">COLECCIÓN DE FLECHAS / SERIE 01</span><h2>Abriendo suministro.</h2><p>Una pieza para tu próxima partida.</p></div><div class="case-presentation" aria-hidden="true">${supplyCase()}<span class="case-seal">SIN LLAVES · CONSEGUIDO JUGANDO</span></div><div class="case-reel-assembly"><span class="case-pointer top" aria-hidden="true"></span><div class="case-reel-window"><div class="case-reel-track" aria-hidden="true"></div></div><span class="case-pointer bottom" aria-hidden="true"></span><div class="case-centerline" aria-hidden="true"></div></div><div class="case-roll-footer"><span class="case-signal"><i></i><span data-case-status>DESPRECINTANDO</span></span><button class="text-button" data-action="skip-chest">Saltar animación ${icon('arrow')}</button></div><p class="case-disclosure">Premio guardado al abrir. El carrusel no cambia las probabilidades.</p></div><div class="case-result" hidden>${chestContent(drop)}</div><div class="sr-only" role="status" aria-live="polite" data-case-live>Abriendo cofre. Puedes saltar la animación.</div></div>`;
}

/** Finite visual presentation only. Inventory was committed before this class was constructed. */
export class ChestOpening {
  private animation: Animation | null = null;
  private timer = 0;
  private frame = 0;
  private observer: ResizeObserver | null = null;
  private disposed = false;
  private done = false;
  private finishX = 0;
  private readonly panel: HTMLElement;
  private readonly track: HTMLElement;
  private readonly viewport: HTMLElement;

  get revealed(): boolean {
    return this.done;
  }

  constructor(
    host: HTMLElement,
    private readonly drop: ChestDrop,
    private readonly settings: () => PlayerSettings,
    private readonly cue: (kind: ChestCue, drop: ChestDrop) => void,
  ) {
    this.panel = host.querySelector('.case-opening')!;
    this.track = this.panel.querySelector('.case-reel-track')!;
    this.viewport = this.panel.querySelector('.case-reel-window')!;
    if (this.reduced || document.hidden) {
      this.reveal(document.hidden);
      return;
    }
    const reel = createChestReel(
      drop,
      seededRandom(`decoration:${drop.skin}:${performance.now()}`),
    );
    this.track.innerHTML = reel.skins
      .map((id, index) => {
        const skin = SKINS.find((item) => item.id === id)!;
        return `<div class="case-reel-card rarity-${skin.rarity}" data-reel-index="${index}"${index === reel.winner ? ' data-reel-winner' : ''}><span class="reel-serial">${ARROW_DESIGNS[id].serial}</span>${arrowArt(id)}<div><small>${RARITY_LABELS[skin.rarity]}</small><strong>${skin.name}</strong></div><i></i></div>`;
      })
      .join('');
    const card = this.track.firstElementChild!.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(this.track).columnGap);
    const width = this.viewport.clientWidth;
    this.finishX = reelLanding(width, card, gap, reel);
    const startX = (width - card) / 2 - 2 * (card + gap);
    this.track.style.transform = `translate3d(${startX}px,0,0)`;
    this.observer = new ResizeObserver(() => {
      if (Math.abs(this.viewport.clientWidth - width) > 1) this.reveal(true);
    });
    this.observer.observe(this.viewport);
    this.cue('unlock', drop);
    this.timer = window.setTimeout(() => {
      if (this.disposed || this.done) return;
      this.panel.dataset.casePhase = 'rolling';
      this.status('BUSCANDO TU PIEZA');
      const frames: Keyframe[] = Array.from({ length: 91 }, (_, i) => ({
        offset: i / 90,
        transform: `translate3d(${startX + (this.finishX - startX) * reelProgress(i / 90)}px,0,0)`,
      }));
      this.animation = this.track.animate(frames, {
        duration: REEL_DURATION_MS,
        easing: 'linear',
        fill: 'forwards',
      });
      let previous = -1;
      let lastSound = -Infinity;
      const tick = () => {
        if (this.disposed || this.done) return;
        const time = Number(this.animation?.currentTime ?? 0) / REEL_DURATION_MS;
        const x = startX + (this.finishX - startX) * reelProgress(time);
        const current = Math.floor((width / 2 - x) / (card + gap));
        if (current !== previous) {
          this.track.querySelector('[data-reel-current]')?.removeAttribute('data-reel-current');
          this.track.children[current]?.setAttribute('data-reel-current', '');
          previous = current;
          if (performance.now() - lastSound >= 35 && !document.hidden) {
            this.cue('tick', drop);
            lastSound = performance.now();
          }
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
      void this.animation.finished.then(
        () => {
          if (this.disposed || this.done) return;
          cancelAnimationFrame(this.frame);
          this.panel.dataset.casePhase = 'settling';
          this.status('PIEZA ENCONTRADA');
          this.timer = window.setTimeout(() => this.reveal(), 300);
        },
        () => undefined,
      );
    }, 450);
  }

  private get reduced(): boolean {
    return this.settings().reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  updateSound(): void {
    const sound = this.settings().sound;
    const button = this.panel.querySelector<HTMLButtonElement>('[data-action="chest-sound"]');
    if (button) {
      button.setAttribute('aria-pressed', String(sound));
      button.innerHTML = `<span data-case-sound>${sound ? 'SONIDO ON' : 'SONIDO OFF'}</span>${icon(sound ? 'volume' : 'mute')}`;
    }
    if (sound && !this.done && !document.hidden) this.cue('tick', this.drop);
  }

  skip(silent = false): void {
    this.reveal(silent);
  }

  private status(text: string): void {
    const status = this.panel.querySelector('[data-case-status]');
    if (status) status.textContent = text;
  }

  private stop(): void {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.observer = null;
    this.animation?.cancel();
    this.animation = null;
  }

  private reveal(silent = false): void {
    if (this.done || this.disposed) return;
    this.done = true;
    this.stop();
    this.track.style.transform = `translate3d(${this.finishX}px,0,0)`;
    this.panel.dataset.casePhase = 'revealed';
    this.panel.querySelector<HTMLElement>('.case-roll-area')!.hidden = true;
    this.panel.querySelector<HTMLElement>('.case-result')!.hidden = false;
    const skin = SKINS.find((item) => item.id === this.drop.skin)!;
    this.panel.querySelector('[data-case-live]')!.textContent =
      `${this.drop.duplicate ? 'Duplicado' : 'Nueva skin'}: ${skin.name}. ${RARITY_LABELS[skin.rarity]}.${this.drop.duplicate ? ` Recibes ${this.drop.shards} fragmentos.` : ''}`;
    if (!silent && !document.hidden) this.cue('reveal', this.drop);
    if (!document.hidden && this.panel.contains(document.activeElement)) {
      this.panel
        .querySelector<HTMLElement>('[data-action="equip-drop"]')
        ?.focus({ preventScroll: true });
    }
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
  }
}
