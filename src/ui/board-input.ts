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
  private active: { pointer: number; id: string; start: TapPoint } | null = null;
  private lastPointer: { id: string; at: number } | null = null;

  constructor(root: HTMLElement, select: (id: string) => void) {
    root.addEventListener('pointerdown', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-arrow]');
      if (!button || button.disabled || !event.isPrimary || event.button !== 0) return;
      this.active = {
        pointer: event.pointerId,
        id: button.dataset.arrow!,
        start: { x: event.clientX, y: event.clientY, at: performance.now() },
      };
    });
    root.addEventListener('pointerup', (event) => {
      const active = this.active;
      if (!active || active.pointer !== event.pointerId) return;
      this.active = null;
      // Compatibility click must not turn a drag into a move or count a tap twice.
      this.lastPointer = { id: active.id, at: performance.now() };
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-arrow]');
      if (
        button?.dataset.arrow === active.id &&
        !button.disabled &&
        isTap(active.start, { x: event.clientX, y: event.clientY, at: performance.now() })
      )
        select(active.id);
    });
    root.addEventListener('pointercancel', () => {
      this.active = null;
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
