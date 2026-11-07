import { mastery } from '../core/mastery';
import type { PlaySession } from '../services/session';

const star =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 3 5 11 12 1-9 9 2 13-10-6-10 6 2-13-9-9 12-1Z"/></svg>';

export function masteryContent(session: PlaySession): string {
  if (session.mode === 'tutorial' || session.state.status !== 'won') return '';
  const stars = mastery(session.state, session.hintsUsed);
  return `<div class="mastery-card" data-stars="${stars}">
    <div class="mastery-stars" role="img" aria-label="${stars} de 3 estrellas">${[1, 2, 3].map((n) => `<span class="mastery-star ${n <= stars ? 'earned' : ''}" style="--star-delay:${(n - 1) * 130}ms">${star}</span>`).join('')}</div>
    <strong>${stars === 3 ? 'DOMINIO TOTAL' : stars === 2 ? 'PRECISIÓN PERFECTA' : 'CIRCUITO COMPLETADO'}</strong>
    <div class="mastery-goals"><span class="done">01 · Completar</span><span class="${stars >= 2 ? 'done' : ''}">02 · Sin errores</span><span class="${stars === 3 ? 'done' : ''}">03 · Sin pistas</span></div>
    <small>${session.hintsUsed === undefined ? 'El uso de pistas no se registró en esta partida antigua.' : `${session.hintsUsed} pistas usadas · Mejor combo ×${session.bestCombo ?? 0}`}</small>
  </div>`;
}
