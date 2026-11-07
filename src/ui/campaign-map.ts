import type { PlayerProfile } from '../services/progress';
import { icon } from './icons';

export const chapterForLevel = (level: number): number => Math.floor((level - 1) / 10);
export const mapPoint = (index: number): { x: number; y: number } => ({
  x: 150 + Math.sin(index * 1.15) * 83,
  y: 75 + index * 101,
});

export function campaignMap(
  profile: PlayerProfile,
  chapter: number,
  selected: number | null,
): string {
  const start = chapter * 10 + 1;
  const current = profile.level;
  const continuing = profile.classicSave?.state.status === 'playing';
  const points = Array.from({ length: 10 }, (_, index) => mapPoint(index));
  const path = points.reduce((result, point, index) => {
    const previous = points[index - 1];
    return previous
      ? `${result} C ${previous.x} ${previous.y + 50}, ${point.x} ${point.y - 50}, ${point.x} ${point.y}`
      : `M ${point.x} ${point.y}`;
  }, '');
  const state =
    selected === null
      ? ''
      : selected < current
        ? 'Completado · Consulta de progreso'
        : selected === current
          ? 'Disponible · Estás aquí'
          : 'Bloqueado · Completa el nivel anterior';
  return `<section class="campaign-map" aria-label="Mapa de campaña">
    <div class="map-heading"><button class="text-button" data-action="map-back">← Volver</button><span>${current - 1} niveles completados</span></div>
    <div class="eyebrow">CIRCUITO ${String(chapter + 1).padStart(2, '0')} · NIVELES ${start}–${start + 9}</div>
    <h1>Mapa de campaña</h1><p class="map-instruction">Explora el camino. Selecciona un nivel para consultar su estado.</p>
    <div class="map-toolbar"><button data-action="map-chapter" data-value="${chapter - 1}" ${chapter === 0 ? 'disabled' : ''}>← Anterior</button><button data-action="map-current">Ir a mi nivel</button><button data-action="map-chapter" data-value="${chapter + 1}">Siguiente →</button></div>
    <div class="map-scroll" tabindex="0" aria-label="Camino desplazable. Flechas para recorrer niveles; Inicio y Fin para extremos del capítulo.">
      <div class="map-circuit"><svg viewBox="0 0 300 1060" preserveAspectRatio="none" aria-hidden="true"><path class="map-path-glow" d="${path}"/><path class="map-path" d="${path}"/></svg>
      <span class="map-decoration" aria-hidden="true">↗<small>ABRE<br>CAMINO</small></span>
      ${points
        .map((point, index) => {
          const level = start + index;
          const status = level < current ? 'complete' : level === current ? 'current' : 'locked';
          const label =
            level < current
              ? 'Completado'
              : level === current
                ? 'Disponible. Estás aquí'
                : 'Bloqueado. Completa el nivel anterior';
          return `<button class="map-node ${status}" style="left:${point.x / 3}%;top:${point.y}px" data-action="map-select" data-value="${level}" aria-label="Nivel ${level}. ${label}" aria-pressed="${selected === level}" ${level === current ? 'aria-current="step"' : ''}><strong>${level}</strong><span aria-hidden="true">${status === 'complete' ? '✓' : status === 'locked' ? icon('lock') : '↗'}</span>${level === current ? '<small>Estás aquí</small>' : ''}</button>`;
        })
        .join('')}</div>
    </div>
    <div class="map-selection" aria-live="polite">${selected === null ? '<strong>Tu siguiente camino te espera</strong><p>Selecciona un nodo numerado.</p>' : `<div><strong>Nivel ${selected}</strong><p>${state}</p></div>${selected === current ? `<button class="primary-button" data-action="map-play">${continuing ? 'Continuar' : 'Jugar'} nivel ${current}<small>${continuing ? 'Sin coste · Tablero guardado' : 'Coste: 1 energía'}</small></button>` : `<p>${selected < current ? 'Progreso conservado. La repetición de niveles no está disponible.' : 'Supera los niveles anteriores para abrir este camino.'}</p>`}`}</div>
  </section>`;
}
