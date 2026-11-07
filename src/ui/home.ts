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
  return `<section class="home-hero atelier-hero">
    <div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> PUZLES DE FLECHAS / VOL. 01</div><h1>FLECHA<br><span>TRAMPA.</span></h1><p class="hero-description">Despeja el tablero.<br>Un movimiento abre el siguiente.</p></div>
    <div class="hero-art hero-equipment" aria-hidden="true"><div class="hero-art-meta"><span>ENCUENTRA LA SALIDA</span><span>FT / 01</span></div><div class="hero-board">${art}</div><div class="hero-art-footer"><span class="hero-guide-line"></span><span>EL ORDEN LO CAMBIA TODO</span></div></div>
    <div class="hero-actions"><button class="primary-button hero-play" data-action="play"><span>${continuing ? 'Continuar partida' : 'Jugar ahora'}<small>CLÁSICO <span>·</span> NIVEL ${String(profile.level).padStart(2, '0')}</small></span>${icon('diagonal')}</button><p class="hero-caption">${icon('heart')} ${premium || profile.economy.collection.lifeTokens > 0 ? 'Cuatro' : 'Tres'} vidas por intento. A tu ritmo.</p>${profile.economy.collection.lifeTokens ? `<p class="bonus-life-note">${profile.economy.collection.lifeTokens} reservas de vida extra. Continuar una partida es gratis.</p>` : ''}</div>
  </section><section class="home-lower"><div class="section-heading"><span>Otros desafíos</span><span class="micro-copy">DOS FORMAS DE COMPETIR</span></div><div class="mode-preview-grid"><button class="mode-preview daily-preview" data-action="daily"><span class="preview-icon">${icon('calendar')}</span><span><small>UNO CADA DÍA</small><strong>El reto de hoy</strong><span>Un tablero. El mismo para todos.</span></span>${icon('diagonal')}</button><button class="mode-preview share-preview" data-action="shared"><span class="preview-icon">${icon('share')}</span><span><small>RETOS COMPARTIDOS</small><strong>Reta a alguien</strong><span>Crea un tablero y comparte el enlace.</span></span>${icon('diagonal')}</button></div><button class="world-shortcut" data-action="worlds">${icon('gift')}<span><strong>Navidad. Halloween. Tu mundo.</strong><small>Fondos de evento gratis · ${profile.events.stamps} sellos disponibles</small></span>${icon('arrow')}</button><div class="rewards-shortcuts"><button data-action="pass">${icon('gift')}<span>Pase de temporada<small>${profile.economy.pass.xp} XP · Recompensas gratuitas</small></span>${icon('arrow')}</button><button data-action="collection">${icon('chest')}<span>Tu colección<small>${profile.economy.collection.chests} cofres · Skins y acabados</small></span>${icon('arrow')}</button></div><div class="home-footnote"><span class="tiny-dots"><i></i><i></i><i></i><i></i></span> 1 energía por intento · Recuperas 1 cada 10 min. Tu progreso se guarda en este dispositivo.</div></section>`;
}
