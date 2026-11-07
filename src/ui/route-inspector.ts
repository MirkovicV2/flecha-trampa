import { findBlocker } from '../core/board';
import { VECTORS } from '../core/types';
import type { Board } from '../core/types';

/** Presentation only. A route inspection never calls the engine or spends a hint. */
export class RouteInspector {
  private timer = 0;

  constructor(private readonly root: HTMLElement) {}

  show(board: Board, id: string, collision = false): void {
    window.clearTimeout(this.timer);
    const layer = this.root.querySelector<HTMLElement>('.route-overlay');
    const status = this.root.querySelector<HTMLElement>('[data-route-status]');
    const arrow = board.arrows.find((item) => item.id === id);
    if (!layer || !arrow || !status) return;
    const blocker = findBlocker(board, arrow);
    const cell = 664 / Math.max(board.width, board.height);
    const offsetX = (720 - board.width * cell) / 2;
    const offsetY = (720 - board.height * cell) / 2;
    const x = offsetX + (arrow.x + 0.5) * cell;
    const y = offsetY + (arrow.y + 0.5) * cell;
    const [dx, dy] = VECTORS[arrow.direction];
    const endX = blocker
      ? offsetX + (blocker.x + 0.5) * cell - dx * cell * 0.44
      : dx < 0
        ? offsetX - 9
        : dx > 0
          ? 720 - offsetX + 9
          : x;
    const endY = blocker
      ? offsetY + (blocker.y + 0.5) * cell - dy * cell * 0.44
      : dy < 0
        ? offsetY - 9
        : dy > 0
          ? 720 - offsetY + 9
          : y;
    layer.dataset.state = blocker ? 'blocked' : 'clear';
    layer.innerHTML = `<svg viewBox="0 0 720 720" aria-hidden="true"><path class="route-beam-halo" d="M ${x} ${y} L ${endX} ${endY}"/><path class="route-beam" d="M ${x} ${y} L ${endX} ${endY}"/><circle class="route-origin" cx="${x}" cy="${y}" r="${cell * 0.42}"/><circle class="route-terminal" cx="${endX}" cy="${endY}" r="8"/>${blocker ? `<rect class="route-blocker" x="${offsetX + blocker.x * cell + 2}" y="${offsetY + blocker.y * cell + 2}" width="${cell - 4}" height="${cell - 4}" rx="${cell * 0.15}"/><path class="route-cross" d="M ${endX - 5} ${endY - 5} l 10 10 m 0 -10 l -10 10"/>` : `<path class="route-cross" d="M ${endX - 5} ${endY} l 4 4 l 7 -9"/>`}</svg>`;
    status.dataset.state = blocker ? 'blocked' : 'clear';
    status.textContent = blocker
      ? `${collision ? 'Choque' : 'Bloqueada'} · fila ${blocker.y + 1}, columna ${blocker.x + 1}`
      : 'Salida libre · esta flecha puede escapar';
    if (collision) this.timer = window.setTimeout(() => this.clear(), 1500);
  }

  clear(): void {
    window.clearTimeout(this.timer);
    const layer = this.root.querySelector<HTMLElement>('.route-overlay');
    if (layer) {
      layer.innerHTML = '';
      delete layer.dataset.state;
    }
    const status = this.root.querySelector<HTMLElement>('[data-route-status]');
    if (status) {
      delete status.dataset.state;
      status.textContent = 'Mantén pulsado para leer una ruta. Suelta sin mover.';
    }
  }
}
