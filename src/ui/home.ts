import { ARROW_COLORS } from '../config/theme';
import type { Direction } from '../core/types';
import type { PlayerProfile } from '../services/progress';
import { arrowArt } from './arrow-art';
import { icon } from './icons';

export function homeScreen(profile: PlayerProfile, premium: boolean): string {
  const continuing = profile.classicSave?.state.status === 'playing';
  const directions: readonly (Direction | null)[] = [
    'up',
    'right',
    'up',
    'left',
    null,
    'right',
    'down',
    'left',
    'down',
  ];
  const art = directions
    .map(
      (direction, index) =>
        `<div class="hero-cell ${direction ? '' : 'empty'}">${direction ? arrowArt(profile.settings.skin, direction, `#${ARROW_COLORS[profile.settings.theme][direction].toString(16).padStart(6, '0')}`) : `<span class="empty-target">${icon('check')}</span>`}<span class="hero-cell-number">${String(index + 1).padStart(2, '0')}</span></div>`,
    )
    .join('');
  const level = profile.level;
  const chapter = Math.floor((level - 1) / 10) + 1;
  const chapterProgress = ((level - 1) % 10) * 10;
  const trailStart = Math.max(1, level - 2);
  const trail = Array.from({ length: 5 }, (_, index) => {
    const milestone = trailStart + index;
    const state = milestone < level ? 'complete' : milestone === level ? 'current' : 'locked';
    return `<span class="campaign-node ${state}" ${state === 'current' ? 'aria-current="step"' : ''}><i>${state === 'complete' ? icon('check') : String(milestone).padStart(2, '0')}</i><small>${state === 'current' ? 'AHORA' : `NIVEL ${milestone}`}</small></span>`;
  }).join('');
  const endless = profile.endlessSave;
  const endlessLabel =
    endless?.state.status === 'playing' || endless?.state.status === 'won'
      ? `Continuar · oleada ${endless.level}`
      : 'Jugar supervivencia';

  return `<section class="home-hero atelier-hero">
    <div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> PUZLES DE FLECHAS / VOL. 01</div><h1>FLECHA<br><span>TRAMPA.</span></h1><p class="hero-description">Despeja el tablero;<br>abre el siguiente camino.</p></div>
    <div class="hero-art hero-equipment" aria-hidden="true"><div class="hero-art-meta"><span>ENCUENTRA LA SALIDA</span><span>FT / 01</span></div><div class="hero-board">${art}</div><div class="hero-art-footer"><span class="hero-guide-line"></span><span>EL ORDEN LO CAMBIA TODO</span></div></div>
    <div class="hero-actions"><button class="primary-button hero-play" data-action="play"><span>${continuing ? 'Continuar' : 'Jugar'} nivel ${profile.level}<small>CAMPAÑA <span>·</span> NIVEL ${String(profile.level).padStart(2, '0')}</small></span>${icon('diagonal')}</button><button class="secondary-button home-map-button" data-action="map">Ver mapa →</button><p class="hero-caption">${icon('heart')} ${continuing ? 'Continuar no consume energía.' : 'Coste: 1 energía · ' + (premium || profile.economy.collection.lifeTokens > 0 ? '4' : '3') + ' vidas.'}</p>${profile.economy.collection.lifeTokens ? `<p class="bonus-life-note">${profile.economy.collection.lifeTokens} reservas de vida extra. Continuar una partida es gratis.</p>` : ''}</div>
  </section>
  <section class="campaign-card" aria-label="Progreso de campaña"><div class="campaign-heading"><span><small>CAPÍTULO ${String(chapter).padStart(2, '0')}</small><strong>El camino se abre</strong></span><span class="campaign-level">${String(level).padStart(2, '0')} <small>/ ∞</small></span></div><div class="campaign-track" aria-label="${chapterProgress}% del capítulo"><i style="--chapter-progress:${chapterProgress}%"></i></div><div class="campaign-trail">${trail}</div><button class="text-button" data-action="map">Explorar el mapa →</button><p>Supera niveles para ver crecer el mapa. La dificultad sigue el ritmo de la campaña.</p></section>
  <section class="home-lower"><div class="section-heading"><span>Elige tu desafío</span><span class="micro-copy">CADA PARTIDA, OTRO RITMO</span></div>
    <div class="mode-preview-grid"><button class="mode-preview endless-preview" data-action="endless-play"><span class="preview-icon">${icon('flame')}</span><span><small>3 VIDAS · FLECHAS ENTRANTES</small><strong>${endlessLabel}</strong><span>Llegan flechas mientras juegas. Evita la congestión.</span></span>${icon('diagonal')}</button>
    <button class="mode-preview daily-preview" data-action="daily"><span class="preview-icon">${icon('calendar')}</span><span><small>UNO CADA DÍA</small><strong>El reto de hoy</strong><span>Un tablero. El mismo para todos.</span></span>${icon('diagonal')}</button><button class="mode-preview share-preview" data-action="shared"><span class="preview-icon">${icon('share')}</span><span><small>RETOS COMPARTIDOS</small><strong>Reta a alguien</strong><span>Crea un tablero y comparte el enlace.</span></span>${icon('diagonal')}</button></div>
    <button class="world-shortcut" data-action="worlds">${icon('gift')}<span><strong>Navidad. Halloween. Tu mundo.</strong><small>Fondos de evento gratis · ${profile.events.stamps} sellos disponibles</small></span>${icon('arrow')}</button><div class="rewards-shortcuts"><button data-action="pass">${icon('gift')}<span>Pase de temporada<small>${profile.economy.pass.xp} XP · Recompensas gratuitas</small></span>${icon('arrow')}</button><button data-action="collection">${icon('chest')}<span>Tu colección<small>${profile.economy.collection.chests} cofres · Skins y acabados</small></span>${icon('arrow')}</button></div><div class="home-footnote"><span class="tiny-dots"><i></i><i></i><i></i><i></i></span> 1 energía por intento · Recuperas 1 cada 10 min. Tu progreso se guarda en este dispositivo.</div>
  </section>`;
}
