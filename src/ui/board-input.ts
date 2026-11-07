export interface TapPoint {
  readonly x: number;
  readonly y: number;
  readonly at: number;
}

/** Keep scrolling, long presses and cancelled gestures from spending a life. */
export function isTap(start: TapPoint, end: TapPoint): boolean {
  return (
    end.at >= start.at &&
    end.at - start.at <= 700 &&
    Math.hypot(end.x - start.x, end.y - start.y) <= 12
  );
}

export class BoardInput {
  private active: { pointer: number; id: string; start: TapPoint; inspected: boolean } | null =
    null;
  private lastPointer: { id: string; at: number } | null = null;
  private holdTimer = 0;

  constructor(
    root: HTMLElement,
    select: (id: string) => void,
    inspect: (id: string | null) => void = () => undefined,
  ) {
    const cancelHold = () => window.clearTimeout(this.holdTimer);
    const cancel = () => {
      cancelHold();
      if (this.active?.inspected) inspect(null);
      if (this.active) this.lastPointer = { id: this.active.id, at: performance.now() };
      this.active = null;
    };
    root.addEventListener('pointerdown', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-arrow]');
      if (!button || button.disabled || !event.isPrimary || event.button !== 0) return;
      cancel();
      this.active = {
        pointer: event.pointerId,
        id: button.dataset.arrow!,
        start: { x: event.clientX, y: event.clientY, at: performance.now() },
        inspected: false,
      };
      const active = this.active;
      this.holdTimer = window.setTimeout(() => {
        if (this.active !== active || button.disabled || !button.isConnected) return;
        active.inspected = true;
        inspect(active.id);
      }, 420);
    });
    root.addEventListener('pointermove', (event) => {
      const active = this.active;
      if (!active || active.pointer !== event.pointerId) return;
      if (Math.hypot(event.clientX - active.start.x, event.clientY - active.start.y) > 12) cancel();
    });
    root.addEventListener('pointerup', (event) => {
      const active = this.active;
      if (!active || active.pointer !== event.pointerId) return;
      cancelHold();
      this.active = null;
      // Compatibility click must not turn a drag into a move or count a tap twice.
      this.lastPointer = { id: active.id, at: performance.now() };
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-arrow]');
      if (active.inspected) {
        inspect(null);
        return;
      }
      if (
        button?.dataset.arrow === active.id &&
        !button.disabled &&
        isTap(active.start, { x: event.clientX, y: event.clientY, at: performance.now() })
      )
        select(active.id);
    });
    root.addEventListener('pointercancel', cancel);
    root.addEventListener('scroll', cancel, true);
    window.addEventListener('pointerup', (event) => {
      if (this.active?.pointer === event.pointerId) cancel();
    });
    root.addEventListener('contextmenu', (event) => {
      if ((event.target as Element).closest('[data-arrow]')) event.preventDefault();
    });
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancel();
    });
    root.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-arrow]');
      if (!button || button.disabled) return;
      if (
        event.detail !== 0 &&
        this.lastPointer &&
        this.lastPointer.id === button.dataset.arrow &&
        performance.now() - this.lastPointer.at < 900
      )
        return;
      // Keyboard, assistive technology and WebView automation retain normal click support.
      select(button.dataset.arrow!);
    });
  }
}
