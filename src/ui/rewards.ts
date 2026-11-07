import { ARROW_COLORS, THEME_LABELS, THEME_NAMES } from '../config/theme';
import { SKINS, SKIN_COST, RARITY_LABELS, RARITY_CHANCES } from '../config/collection';
import type { SkinId } from '../config/collection';
import { PASS_TIERS, XP_PER_TIER } from '../config/pass';
import type { Reward } from '../config/pass';
import type { PlayerProfile } from '../services/progress';
import type { ChestDrop } from '../services/economy';
import { icon } from './icons';

export function skinPreview(id: SkinId): string {
  const shape = SKINS.find((skin) => skin.id === id)!.shape;
  const extra: Record<typeof shape, string> = {
    classic: '',
    double: '<path d="m18 32 6-6 6 6"/>',
    bolt: '<path d="m17 30 5-7-2 7 6-3"/>',
    pixel: '<path d="M14 20v-6h6m8 0h6v6M21 34h6"/>',
    diamond: '<path d="m24 21 6 6-6 6-6-6Z"/>',
    orbit: '<circle cx="24" cy="25" r="8"/>',
    royal: '<path d="m13 21-2-7 7 3m12 0 7-3-2 7M19 38h10"/>',
    nova: '<path d="m12 25 4-3m16 0 4 3M15 34l3-3m12 0 3 3M24 6v3"/>',
  };
  return `<svg class="skin-preview" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 35V13m-9 9 9-9 9 9"/>${extra[shape]}</svg>`;
}

export function themeSwatches(theme: keyof typeof ARROW_COLORS): string {
  return `<span class="theme-swatches">${Object.values(ARROW_COLORS[theme])
    .map((color) => `<i style="background:#${color.toString(16).padStart(6, '0')}"></i>`)
    .join('')}</span>`;
}

export function rewardLabel(reward: Reward): string {
  if (reward.kind === 'theme') return `Tema ${THEME_LABELS[reward.id]}`;
  if (reward.kind === 'skin') return `Skin ${SKINS.find((skin) => skin.id === reward.id)!.name}`;
  const labels = {
    energy: 'energía',
    hints: 'pistas',
    chests: 'cofres',
    shards: 'fragmentos',
    lives: 'vidas extra',
  };
  return `${reward.amount} ${labels[reward.kind]}`;
}

function passContent(
  profile: PlayerProfile,
  premium: boolean,
  purchasesAvailable: boolean,
): string {
  const pass = profile.economy.pass;
  const level = Math.min(10, Math.floor(pass.xp / XP_PER_TIER));
  return `<section class="pass-summary"><div class="eyebrow">TEMPORADA 01 · CAMINOS</div><h2>Un movimiento.<br>Una recompensa.</h2><p>Gana niveles clásicos nuevos: 100 XP. Completa el diario por primera vez: 150 XP. Sin errores: +25 XP.</p><div class="pass-xp"><strong>Nivel ${level} / 10</strong><span data-pass-xp>${pass.xp} XP</span></div><progress max="1000" value="${Math.min(1000, pass.xp)}" aria-label="Progreso del pase"></progress><p class="fine-print">100 XP por nivel del pase. Las recompensas se recogen una sola vez. Esta temporada no tiene fecha de cierre en esta versión.</p></section><div class="premium-summary"><div>${icon('shield')}<strong>${premium ? 'Pase Plus activo' : 'Pase Plus'}</strong><p>Sin intersticiales, hasta 8 cargas de energía, 4 vidas en clásico y una segunda ruta de recompensas. Diario y retos mantienen 3 vidas.</p><p class="fine-print">${premium ? 'Ventajas activadas mediante tu compra verificada.' : 'Disponible más adelante. Esta versión no incluye compras ni anuncios.'}</p></div>${!premium ? `<button class="secondary-button" data-action="buy-pass" ${purchasesAvailable ? '' : 'disabled'}>${purchasesAvailable ? 'Obtener Pase Plus' : 'Pase Plus · Próximamente'}</button>` : ''}<button class="text-button" data-action="restore-purchases">Restaurar compras</button></div><div class="pass-rewards">${PASS_TIERS.map(
    (tier) =>
      `<article class="pass-tier"><strong class="tier-number">${String(tier.tier).padStart(2, '0')}<small>${tier.tier * XP_PER_TIER} XP</small></strong>${(
        ['free', 'premium'] as const
      )
        .map((track) => {
          const claimed = pass.claimed.includes(`${track}:${tier.tier}`);
          const eligible = pass.xp >= tier.tier * XP_PER_TIER && (track === 'free' || premium);
          return `<div class="pass-track ${track}"><span class="eyebrow">${track === 'free' ? 'GRATIS' : 'PLUS'}</span><strong>${rewardLabel(tier[track])}</strong><button class="${eligible && !claimed ? 'primary-button' : 'secondary-button'}" data-action="claim-reward" data-value="${track}:${tier.tier}" aria-label="${claimed ? 'Recogido' : 'Recoger'} ${track === 'free' ? 'gratis' : 'Plus'} nivel ${tier.tier}" ${!eligible || claimed ? 'disabled' : ''}>${claimed ? 'Recogido' : eligible ? 'Recoger' : track === 'premium' && !premium ? 'Requiere Plus' : 'Bloqueado'}</button></div>`;
        })
        .join('')}</article>`,
  ).join('')}</div>`;
}

export function themesContent(profile: PlayerProfile): string {
  return `<div class="theme-options">${THEME_NAMES.map((theme) => {
    const owned = profile.economy.collection.ownedThemes.includes(theme);
    return `<button data-action="theme" data-value="${theme}" class="theme-option ${profile.settings.theme === theme ? 'selected' : ''}" aria-pressed="${profile.settings.theme === theme}" ${owned ? '' : 'disabled'}>${themeSwatches(theme)}<span>${THEME_LABELS[theme]}${owned ? '' : `<small>Pase gratis · Nivel ${theme === 'midnight' ? 3 : 8}</small>`}</span>${profile.settings.theme === theme ? icon('check') : ''}</button>`;
  }).join('')}</div>`;
}

function collectionContent(profile: PlayerProfile): string {
  const collection = profile.economy.collection;
  return `<section class="chest-vault"><div class="chest-art" aria-hidden="true">${icon('chest')}</div><div><div class="eyebrow">TU BOTÍN, TU ESTILO</div><h2>${collection.chests} ${collection.chests === 1 ? 'cofre disponible' : 'cofres disponibles'}</h2><p>Un cofre de bienvenida y más en el pase gratuito. Los cofres se consiguen jugando; no se venden.</p><button class="primary-button" data-action="open-chest" ${collection.chests < 1 ? 'disabled' : ''}>Abrir cofre ${icon('spark')}</button></div></section><div class="chest-odds">${Object.entries(
    RARITY_CHANCES,
  )
    .map(
      ([rarity, chance]) =>
        `<span class="rarity-${rarity}">${RARITY_LABELS[rarity as keyof typeof RARITY_CHANCES]} <strong>${chance}%</strong></span>`,
    )
    .join(
      '',
    )}</div><p class="fine-print">Probabilidades base por apertura. Garantía: épica o legendaria en un máximo de ${10 - collection.sinceEpic} aperturas. Los duplicados se convierten en fragmentos.</p><div class="section-heading"><h2>Skins de flechas</h2><span class="shard-balance">${icon('spark')} ${collection.shards} fragmentos</span></div><div class="skin-grid">${SKINS.map(
    (skin) => {
      const owned = collection.ownedSkins.includes(skin.id);
      const selected = profile.settings.skin === skin.id;
      return `<article class="skin-card rarity-${skin.rarity} ${selected ? 'selected' : ''}">${skinPreview(skin.id)}<span class="eyebrow">${RARITY_LABELS[skin.rarity]}</span><h3>${skin.name}</h3><button class="secondary-button" data-action="${owned ? 'skin' : 'craft-skin'}" data-value="${skin.id}" ${selected || (!owned && collection.shards < SKIN_COST[skin.rarity]) ? 'disabled' : ''}>${selected ? 'Equipada' : owned ? 'Equipar' : `Crear · ${SKIN_COST[skin.rarity]} fragmentos`}</button></article>`;
    },
  ).join(
    '',
  )}</div><p class="bonus-life-note">${icon('heart')} ${collection.lifeTokens} reservas de vida extra. Cada reserva añade una cuarta vida al siguiente intento clásico. Se consiguen en el nivel 4 del pase gratuito.</p><h2 class="collection-themes-title">Temas del juego</h2>${themesContent(profile)}`;
}

export function rewardsContent(
  profile: PlayerProfile,
  premium: boolean,
  tab: 'pass' | 'collection',
  purchasesAvailable: boolean,
): string {
  return `<section class="page-section rewards-page"><div class="eyebrow">JUEGA. DESBLOQUEA. HAZLO TUYO.</div><h1 class="page-title">Tu siguiente<br>recompensa.</h1><div class="rewards-tabs" role="group" aria-label="Recompensas"><button data-action="pass" class="${tab === 'pass' ? 'selected' : ''}" aria-pressed="${tab === 'pass'}">Pase de temporada</button><button data-action="collection" class="${tab === 'collection' ? 'selected' : ''}" aria-pressed="${tab === 'collection'}">Colección</button></div>${tab === 'pass' ? passContent(profile, premium, purchasesAvailable) : collectionContent(profile)}</section>`;
}

export function chestContent(drop: ChestDrop): string {
  const skin = SKINS.find((item) => item.id === drop.skin)!;
  return `<div class="chest-reveal rarity-${skin.rarity}"><div class="eyebrow">${drop.duplicate ? 'DUPLICADO · COMPENSACIÓN' : 'NUEVA SKIN'}</div>${skinPreview(skin.id)}<span class="rarity-label">${RARITY_LABELS[skin.rarity]}</span><h2>${skin.name}</h2><p>${drop.duplicate ? `Ya la tienes: +${drop.shards} fragmentos para crear la skin que elijas.` : 'Ya forma parte de tu colección. Todas las direcciones siguen siendo reconocibles.'}</p><button class="primary-button" data-action="equip-drop">Equipar skin ${icon('check')}</button><button class="text-button centered" data-action="close-overlay">Volver a la colección</button></div>`;
}
