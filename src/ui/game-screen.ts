import { POWER_INFO, selectPowerArrow } from '../core/special-arrow';
import type { PlaySession } from '../services/session';
import { SHAPE_LABELS } from '../generator/shapes';
import { formatTime } from '../utils/format';
import { icon } from './icons';

export function gameScreen(session: PlaySession, hints: number, powerSeen = false): string {
  const tutorial = session.mode === 'tutorial';
  const power = POWER_INFO[session.powerKind ?? 'pulse'];
  const hasPower =
    session.powerArrowId ||
    ((session.powerKind || !session.powerPolicy) &&
      selectPowerArrow(session.initialBoard, session.level, session.powerKind));
  const shape = session.config.shape ?? 'square';
  const mode = tutorial
    ? 'APRENDER HACIENDO'
    : session.mode === 'classic'
      ? 'MODO CLÁSICO'
      : session.mode === 'endless'
        ? 'SUPERVIVENCIA · OLEADAS'
        : session.mode === 'daily'
          ? 'DESAFÍO DIARIO'
          : 'RETO COMPARTIDO';
  return `<section class="game-layout ${session.mode === 'endless' ? 'survival-game' : ''}">
    <div class="game-intro"><div class="eyebrow">${mode}</div>
      <h1 class="game-title">${tutorial ? 'Aprende el orden.' : session.mode === 'endless' ? 'Aguanta el pulso.' : 'Abre camino.'}</h1>
      <p class="game-description">${session.mode === 'endless' ? 'Llegan flechas mientras despejas.<br>Sobrevive al circuito.' : 'Una salida libera la siguiente.<br>Lee el circuito. Encuentra tu ritmo.'}</p>
      <div class="desktop-tip">${icon('help')}<p>Toca para sacar una flecha. Mantén pulsado para ver su recorrido sin moverla. Cada choque cuesta una vida.</p></div>
    </div>
    <div class="play-area">
      ${session.lifeTokenSpent ? `<p class="bonus-life-note">${icon('heart')} Vida extra del pase · 4 vidas en este intento</p>` : ''}
      ${session.mode === 'endless' ? `<div class="survival-console" data-survival><div><strong>OLEADA ${session.level}</strong><span data-survival-load></span></div><p data-survival-status></p><p data-survival-cadence></p><small>Al llegar al límite: 10 s para despejar o −1 vida. Sin vidas, termina la partida. Pausar detiene las entradas.</small></div>` : ''}
      <div class="game-hud"><div class="lives" role="img" aria-label="3 vidas" data-lives></div>
        <span class="game-timer">${icon('clock')}<span data-timer>${formatTime(session.elapsedMs)}</span></span>
      </div>
      <div class="frenzy-console" data-tier="idle"><span class="frenzy-symbol" aria-hidden="true">ϟ</span>
        <div class="frenzy-copy"><small>COMBO · 1,8 SEGUNDOS</small><strong data-frenzy-title>ENCUENTRA EL RITMO</strong></div>
        <div class="frenzy-timer" role="progressbar" aria-label="Tiempo para continuar el combo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-frenzy-fill></i></div>
        <span class="frenzy-count" data-frenzy-count>—</span>
      </div>
      <div class="board-index"><span>${SHAPE_LABELS[shape]}</span><span>${session.config.width} × ${session.config.height} <i>·</i> ${session.state.totalArrows} PIEZAS</span></div>
      <div class="board-viewport"><div class="board-frame" data-shape="${shape}">
        <div class="board-corner corner-tl"></div><div class="board-corner corner-br"></div>
        <div class="board-host" aria-hidden="true"></div><div class="route-overlay" aria-hidden="true"></div>
        <div class="board-controls" role="group" aria-label="Tablero de flechas"></div>
        <div class="board-loading">Preparando tu camino…</div>
      </div></div>
      <p class="game-status" data-game-status data-kind="ready" role="status" aria-live="polite" aria-atomic="true">${session.mode === 'endless' ? 'Flechas en camino. Despeja para evitar la congestión.' : 'Toca una flecha con salida libre.'}</p>
      <div class="board-feedback"><button class="text-button route-toggle" data-action="inspect-routes" aria-pressed="false">${icon('help')} Rutas</button>
        <strong class="combo-badge" data-combo hidden></strong>
        <button class="text-button zoom-button" data-action="zoom-board" aria-pressed="false">Ampliar tablero</button>
      </div>
      <p class="route-status" data-route-status role="status" aria-live="polite">Mantén pulsado para leer una ruta. Suelta sin mover.</p>
      ${session.mode === 'classic' && hasPower ? `<details class="power-arrow-note" ${session.powerArrowId && !powerSeen ? 'open' : ''}><summary>${power.symbol} ${power.name} especial · Cómo funciona</summary><div><p>Saca la flecha marcada: ${power.description} Debe tener salida libre; si choca, pierde una vida y el especial no se activa.</p><p>Una por nivel cuando hay objetivos válidos. Pulso ✦: hasta 2 cercanas de igual dirección, a distancia máxima de 2 casillas. Rayo ↔: hasta 3 de su fila o columna. Nova ✳: hasta 3 vecinas, incluidas diagonales.</p><p>En cada grupo de tres niveles con objetivos válidos aparece una vez cada tipo, en orden barajado; reintentar o recargar conserva el poder</p><button class="text-button" data-action="power-dismiss">Entendido</button></div></details>` : ''}
      <div class="board-progress"><span>FLECHAS LIBERADAS</span><strong data-counter></strong><div class="progress-track"><i data-progress></i></div></div>
      <div class="tutorial-instruction" ${tutorial ? '' : 'hidden'}></div>
      <div class="game-tools"><button class="hint-button" data-action="hint">${icon('spark')}<span>Una pista</span><span class="hint-count" data-hints>${hints}</span></button>
        <button class="text-button" data-action="pause">Tomar un respiro ${icon('pause')}</button>
      </div>
      <p class="board-caption">${icon('arrow')} Cada salida abre otra posibilidad.</p>
    </div></section>`;
}
