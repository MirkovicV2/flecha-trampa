import type { CommercePreviewPort, PreviewPlacement } from '../services/preview-commerce';
import type { Product } from '../services/purchases';
import { icon } from './icons';

export const PREVIEW_AD_SECONDS = 4;

/** Modal shell owns timers/focus and always cancels when the application leaves the foreground. */
export class CommercePreviewView implements CommercePreviewPort {
  private cancelCurrent: (() => void) | null = null;
  get active(): boolean {
    return this.cancelCurrent !== null;
  }
  constructor(private readonly gameRoot: HTMLElement) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.cancel();
    });
    window.addEventListener('pagehide', () => this.cancel());
  }
  cancel(): void {
    this.cancelCurrent?.();
  }

  async advertise(placement: PreviewPlacement): Promise<'completed' | 'cancelled'> {
    const rewarded = placement !== 'between-levels';
    const reward = placement === 'hint' ? '+1 pista de prueba' : '+1 energía de prueba';
    const seconds = rewarded ? PREVIEW_AD_SECONDS : 2;
    const content = `<div class="commerce-kicker"><span class="preview-pill">PRUEBA · SIN COBRO</span><span>${rewarded ? 'RECOMPENSADO' : 'ENTRE NIVELES'}</span></div><div class="demo-ad-creative"><div class="ad-orbits" aria-hidden="true"><i></i><i></i><i></i></div><div class="ad-glyph" aria-hidden="true">↗</div><span>FLECHA TRAMPA</span><h2>Encuentra<br>tu próxima<br><em>salida.</em></h2><div class="ad-creative-tag">UN TABLERO. MIL POSIBILIDADES.</div></div><div class="ad-details"><div><strong>${rewarded ? 'Anuncio recompensado de prueba' : 'Intersticial de prueba'}</strong><p>${rewarded ? `Completa la vista previa para recibir ${reward}. Cerrar antes no otorga nada.` : 'Así se verá la pausa publicitaria entre dos niveles. El Pase Plus la omite.'}</p></div><span class="ad-countdown" data-ad-countdown>${seconds}s</span></div><progress class="ad-progress" data-ad-progress value="0" max="${seconds}" aria-label="Progreso del anuncio de prueba"></progress><button class="primary-button" data-preview-confirm disabled>${rewarded ? `Esperar · ${seconds}s` : `Continuar en ${seconds}s`}</button><button class="text-button centered" data-preview-cancel>${rewarded ? 'Cerrar sin recompensa' : 'Cerrar vista previa'}</button><p class="commerce-footnote">Creatividad local. Sin anunciantes, seguimiento ni ingresos publicitarios reales.</p>`;
    return (await this.present(
      content,
      seconds,
      rewarded ? `Recoger ${reward}` : 'Continuar al siguiente nivel',
    ))
      ? 'completed'
      : 'cancelled';
  }

  async checkout(product: Product): Promise<boolean> {
    if (product !== 'battle-pass') return false;
    return this.present(
      `<div class="commerce-kicker"><span class="preview-pill">COMPRA DE PRUEBA</span><span>SIN COBRO REAL</span></div><div class="checkout-hero"><div class="plus-emblem" aria-hidden="true">${icon('shield')}<b>+</b></div><div class="eyebrow">TEMPORADA 01 · CAMINOS</div><h2>Tu pase.<br><em>Más posibilidades.</em></h2><p>Una segunda ruta para tus pequeñas victorias.</p></div><div class="checkout-perks"><div>${icon('shield')}<span><strong>Sin intersticiales</strong><small>Entre niveles, sigue jugando directamente.</small></span></div><div>${icon('heart')}<span><strong>4 vidas en clásico</strong><small>Diario y retos conservan sus 3 vidas.</small></span></div><div>${icon('energy')}<span><strong>Hasta 8 cargas de energía</strong><small>Se recargan por tiempo; activar el pase no las rellena.</small></span></div><div>${icon('gift')}<span><strong>Segunda ruta de recompensas</strong><small>Avanza jugando y recoge los premios Plus.</small></span></div></div><div class="checkout-total"><span>Pase Plus de prueba<small>Activación local · Temporada 01</small></span><strong>0,00 €<small>NO SE COBRA</small></strong></div><div class="checkout-method">${icon('shield')}<span>Simulador de compra. No se piden tarjeta, cuenta ni datos bancarios. No es una suscripción.</span></div><button class="primary-button" data-preview-confirm>Activar Pase Plus de prueba ${icon('arrow')}</button><button class="text-button centered" data-preview-cancel>Ahora no</button><p class="commerce-footnote">Este pase sirve para probar la experiencia. No es una compra de Google Play o App Store ni acredita una compra futura.</p>`,
    );
  }

  private present(content: string, seconds = 0, readyLabel = ''): Promise<boolean> {
    if (this.active || document.hidden) return Promise.resolve(false);
    return new Promise((resolve) => {
      const previouslyInert = this.gameRoot.inert;
      const previousFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const layer = document.createElement('div');
      layer.className = 'commerce-backdrop';
      layer.innerHTML = `<section class="commerce-card" role="dialog" aria-modal="true" aria-label="${seconds ? 'Anuncio de prueba' : 'Compra de prueba del Pase Plus'}"><button class="commerce-close" data-preview-close aria-label="Cancelar vista previa">${icon('close')}</button>${content}</section>`;
      const confirm = layer.querySelector<HTMLButtonElement>('[data-preview-confirm]')!;
      const cancel = layer.querySelector<HTMLButtonElement>('[data-preview-cancel]')!;
      let finished = false;
      let remaining = seconds * 1000;
      let lastTick = performance.now();
      let timer = 0;
      const keydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        }
        if (event.key !== 'Tab') return;
        const buttons = [...layer.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons.at(-1)?.focus();
        } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
          event.preventDefault();
          buttons[0]?.focus();
        }
      };
      const finish = (completed: boolean) => {
        if (finished) return;
        finished = true;
        clearInterval(timer);
        this.cancelCurrent = null;
        layer.removeEventListener('keydown', keydown);
        layer.remove();
        this.gameRoot.inert = previouslyInert;
        if (previousFocus?.isConnected && !document.hidden)
          previousFocus.focus({ preventScroll: true });
        resolve(completed);
      };
      this.cancelCurrent = () => finish(false);
      confirm.addEventListener('click', () => {
        if (remaining <= 0 && !document.hidden) finish(true);
      });
      cancel.addEventListener('click', () => finish(false));
      layer.querySelector('[data-preview-close]')?.addEventListener('click', () => finish(false));
      layer.addEventListener('keydown', keydown);
      this.gameRoot.inert = true;
      document.body.append(layer);
      (seconds ? cancel : confirm).focus({ preventScroll: true });
      if (seconds)
        timer = window.setInterval(() => {
          if (document.hidden) {
            finish(false);
            return;
          }
          const now = performance.now();
          remaining = Math.max(0, remaining - Math.min(500, now - lastTick));
          lastTick = now;
          const countdown = layer.querySelector('[data-ad-countdown]');
          const progress = layer.querySelector<HTMLProgressElement>('[data-ad-progress]');
          if (countdown)
            countdown.textContent = remaining > 0 ? `${Math.ceil(remaining / 1000)}s` : '✓';
          if (progress) progress.value = seconds - remaining / 1000;
          if (remaining <= 0) {
            confirm.disabled = false;
            confirm.textContent = readyLabel;
            clearInterval(timer);
          }
        }, 100);
    });
  }
}
