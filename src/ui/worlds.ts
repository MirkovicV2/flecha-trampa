import { WORLDS } from '../config/worlds';
import type { WorldId } from '../config/worlds';
import type { PlayerProfile } from '../services/progress';
import { worldArt } from './world-art';
import { icon } from './icons';

export function worldGallery(profile: PlayerProfile): string {
  return `<section class="worlds-intro"><div><div class="eyebrow">EVENTOS · SIEMPRE GRATIS</div><h2>Otro mundo.<br>El mismo ingenio.</h2><p>Escenarios completos que cambian tu partida. Independientes de la paleta y de la skin de tus flechas.</p></div><div class="stamp-wallet">${icon('gift')}<strong data-stamps>${profile.events.stamps}</strong><span>SELLOS DE EVENTO</span></div></section><div class="worlds-rules"><span>+1 sello por nivel clásico nuevo</span><span>+2 por el primer diario del día</span><span>1 sello de bienvenida</span></div><p class="fine-print world-fineprint">Sin compras, sin energía para desbloquearlos y sin caducidad. Los sellos se ganan superando niveles; repetir y practicar no genera sellos.</p><div class="world-grid">${WORLDS.map(
    (world) => {
      const owned = profile.events.ownedWorlds.includes(world.id);
      const selected = profile.settings.world === world.id;
      const affordable = profile.events.stamps >= world.cost;
      return `<article class="world-card ${selected ? 'selected' : ''}" data-world-card="${world.id}" style="--world-accent:${world.accent}"><button class="world-art-button" data-action="preview-world" data-value="${world.id}" aria-label="Vista previa de ${world.name}">${worldArt(world.id)}<span class="world-preview-label">${icon('diagonal')} VISTA PREVIA</span>${selected ? '<span class="world-equipped">EQUIPADO</span>' : ''}</button><div class="world-card-copy"><span class="eyebrow">${world.event}</span><h3>${world.name}</h3><p>${world.description}</p><button class="${affordable || owned ? 'primary-button' : 'secondary-button'}" data-action="${owned ? 'equip-world' : 'unlock-world'}" data-value="${world.id}" ${selected || (!owned && !affordable) ? 'disabled' : ''}>${selected ? 'Equipado' : owned ? 'Equipar fondo' : affordable ? `Desbloquear · ${world.cost} ${world.cost === 1 ? 'sello' : 'sellos'}` : `${profile.events.stamps} / ${world.cost} sellos`}</button></div></article>`;
    },
  ).join('')}</div>`;
}

export function worldPreview(profile: PlayerProfile, id: WorldId): string {
  const world = WORLDS.find((item) => item.id === id)!;
  const owned = profile.events.ownedWorlds.includes(id);
  const selected = profile.settings.world === id;
  return `<div class="world-preview-art">${worldArt(id)}<div class="world-preview-board" aria-hidden="true">${['↑', '→', '↓', '←', '↑', '→', '←', '↓', '↑'].map((arrow, index) => `<i style="--arrow-index:${index}">${arrow}</i>`).join('')}</div></div><div class="eyebrow">${world.event} · VISTA PREVIA</div><h2>${world.name}</h2><p>${world.description} Este fondo se aplica al inicio y a todas tus partidas.</p><p class="fine-print">Cosmético gratuito. Tus flechas mantienen su paleta y su dirección.</p><button class="primary-button" data-action="${owned ? 'equip-world' : 'unlock-world'}" data-value="${id}" ${selected || (!owned && profile.events.stamps < world.cost) ? 'disabled' : ''}>${selected ? 'Ya equipado' : owned ? 'Equipar fondo' : `Desbloquear · ${world.cost} ${world.cost === 1 ? 'sello' : 'sellos'}`}</button><button class="text-button centered" data-action="close-overlay">Volver a los fondos</button>`;
}
