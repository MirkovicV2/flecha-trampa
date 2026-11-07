import { ARROW_COLORS, THEME_LABELS, THEME_NAMES } from '../config/theme';
import { SKINS, SKIN_COST, RARITY_LABELS, RARITY_CHANCES } from '../config/collection';
import type { SkinId } from '../config/collection';
import { PASS_TIERS, XP_PER_TIER, MAX_PASS_TIER } from '../config/pass';
import type { Reward } from '../config/pass';
import type { PlayerProfile } from '../services/progress';
import type { ChestDrop } from '../services/economy';
import { icon } from './icons';
import { worldGallery } from './worlds';
import { arrowArt, supplyCase } from './arrow-art';
import { ARROW_DESIGNS } from '../config/arrow-designs';

export function skinPreview(id: SkinId): string {
  return arrowArt(id);
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
    stamps: 'sellos para fondos',
  };
  return `${reward.amount} ${labels[reward.kind]}`;
}

function rewardArt(reward: Reward): string {
  if (reward.kind === 'skin')
    return `<span class="pass-prize rarity-${SKINS.find((s) => s.id === reward.id)!.rarity}">${skinPreview(reward.id)}</span>`;
  if (reward.kind === 'theme') return `<span class="pass-prize">${themeSwatches(reward.id)}</span>`;
  return `<span class="pass-prize">${icon(({ energy: 'energy', hints: 'spark', chests: 'chest', shards: 'spark', lives: 'heart', stamps: 'gift' } as const)[reward.kind])}<b>+${reward.amount}</b></span>`;
}

function passContent(
  profile: PlayerProfile,
  premium: boolean,
  purchasesAvailable: boolean,
  preview: boolean,
): string {
  const pass = profile.economy.pass;
  const level = Math.min(MAX_PASS_TIER, Math.floor(pass.xp / XP_PER_TIER));
  return `<section class="pass-summary"><div class="eyebrow">TEMPORADA 01 · CAMINOS</div><h2>Un movimiento.<br>Una recompensa.</h2><p>Gana niveles clásicos nuevos: 100 XP. Completa el diario por primera vez: 150 XP. Sin errores: +25 XP.</p><div class="pass-xp"><strong>Nivel ${level} / ${MAX_PASS_TIER}</strong><span data-pass-xp>${pass.xp} XP</span></div><progress max="${MAX_PASS_TIER * XP_PER_TIER}" value="${Math.min(MAX_PASS_TIER * XP_PER_TIER, pass.xp)}" aria-label="Progreso del pase"></progress><p class="fine-print">100 XP por nivel del pase. 40 niveles · 80 recompensas entre las dos rutas. Las skins repetidas se convierten en fragmentos. Las recompensas se recogen una sola vez. Esta temporada no tiene fecha de cierre en esta versión.</p></section><div class="premium-summary"><div>${icon('shield')}<strong>${premium ? (preview ? 'Pase Plus de prueba activo' : 'Pase Plus activo') : 'Pase Plus'}</strong><p>Sin intersticiales, hasta 8 cargas de energía, 4 vidas en clásico y una segunda ruta de recompensas. Diario y retos mantienen 3 vidas.</p><p class="fine-print">${preview ? 'PRUEBA · SIN COBRO. Prueba la activación, la restauración y las ventajas. No es una compra real.' : premium ? 'Ventajas activadas mediante tu compra verificada.' : 'Disponible más adelante. Esta versión no incluye compras ni anuncios.'}</p></div>${!premium ? `<button class="secondary-button" data-action="buy-pass" ${purchasesAvailable ? '' : 'disabled'}>${purchasesAvailable ? (preview ? 'Probar Pase Plus · 0 €' : 'Obtener Pase Plus') : 'Pase Plus · Próximamente'}</button>` : ''}<button class="text-button" data-action="restore-purchases">Restaurar compras</button></div><div class="pass-milestones" aria-label="Grandes recompensas gratuitas">${PASS_TIERS.filter(
    (tier) => [15, 20, 25, 30, 40].includes(tier.tier),
  )
    .map(
      (tier) =>
        `<button class="pass-milestone" data-action="pass-chapter" data-value="${tier.tier}">${rewardArt(tier.free)}<small>NIVEL ${tier.tier} · GRATIS</small><strong>${rewardLabel(tier.free)}</strong></button>`,
    )
    .join(
      '',
    )}</div><nav class="pass-chapters" aria-label="Capítulos del pase">${[1, 11, 21, 31].map((tier) => `<button class="secondary-button" data-action="pass-chapter" data-value="${tier}">${tier}—${tier + 9}</button>`).join('')}</nav><div class="pass-rewards">${PASS_TIERS.map(
    (tier) =>
      `<article class="pass-tier ${tier.tier % 5 === 0 ? 'milestone-tier' : ''}" data-pass-tier="${tier.tier}"><strong class="tier-number">${String(tier.tier).padStart(2, '0')}<small>${tier.tier * XP_PER_TIER} XP</small></strong>${(
        ['free', 'premium'] as const
      )
        .map((track) => {
          const claimed = pass.claimed.includes(`${track}:${tier.tier}`);
          const eligible = pass.xp >= tier.tier * XP_PER_TIER && (track === 'free' || premium);
          return `<div class="pass-track ${track}"><span class="eyebrow">${track === 'free' ? 'GRATIS' : 'PLUS'}</span>${rewardArt(tier[track])}<strong>${rewardLabel(tier[track])}</strong><button class="${eligible && !claimed ? 'primary-button' : 'secondary-button'}" data-action="claim-reward" data-value="${track}:${tier.tier}" aria-label="${claimed ? 'Recogido' : 'Recoger'} ${track === 'free' ? 'gratis' : 'Plus'} nivel ${tier.tier}" ${!eligible || claimed ? 'disabled' : ''}>${claimed ? 'Recogido' : eligible ? 'Recoger' : track === 'premium' && !premium ? 'Requiere Plus' : 'Bloqueado'}</button></div>`;
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
  const equipped = SKINS.find((skin) => skin.id === profile.settings.skin)!;
  const design = ARROW_DESIGNS[equipped.id];
  return `<div class="collection-masthead"><div><span class="studio-kicker">FLECHA TRAMPA / ATELIER 01</span><h2>Elige tu firma.</h2><p>32 piezas. Encuentra tu firma de movimiento.</p></div><span class="collection-count"><strong>${String(collection.ownedSkins.length).padStart(2, '0')}</strong><small>/ ${SKINS.length} EN COLECCIÓN</small></span></div><section class="equipped-showcase rarity-${equipped.rarity}"><div class="showcase-drawing"><span class="drawing-coordinate top">${design.serial}</span><div class="skin-plinth">${skinPreview(equipped.id)}</div><span class="drawing-coordinate bottom">${design.workshop}</span></div><div class="showcase-copy"><span class="studio-kicker">TU PIEZA EQUIPADA</span><h2>${equipped.name}</h2><span class="finish-label">${design.finish}</span><p>${design.description}</p><button class="text-button" data-action="preview-skin" data-value="${equipped.id}">Inspeccionar y probar ${icon('diagonal')}</button></div></section><section class="chest-vault"><div class="chest-art" aria-hidden="true">${supplyCase()}</div><div><div class="studio-kicker">SUMINISTRO 01 · CONSEGUIDO JUGANDO</div><h2>${collection.chests} ${collection.chests === 1 ? 'cofre disponible' : 'cofres disponibles'}</h2><p>Una pieza de la colección en cada apertura. Sin llaves, sin compras.</p><button class="primary-button" data-action="open-chest" ${collection.chests < 1 ? 'disabled' : ''}>Abrir cofre ${icon('arrow')}</button></div></section><div class="chest-odds">${Object.entries(
    RARITY_CHANCES,
  )
    .map(
      ([rarity, chance]) =>
        `<span class="rarity-${rarity}">${RARITY_LABELS[rarity as keyof typeof RARITY_CHANCES]} <strong>${chance}%</strong></span>`,
    )
    .join(
      '',
    )}</div><p class="fine-print chest-disclosure">Probabilidades por apertura · Épica o superior en un máximo de ${10 - collection.sinceEpic} cofres. Duplicados → fragmentos. La animación no modifica el premio.</p><div class="section-heading"><h2>Skins de flechas</h2><span class="shard-balance">${icon('spark')} ${collection.shards} fragmentos</span></div><div class="collection-filter" role="group" aria-label="Filtrar skins"><button data-action="filter-skins" data-value="all" aria-pressed="true">Todas <span>${SKINS.length}</span></button><button data-action="filter-skins" data-value="owned" aria-pressed="false">En propiedad <span>${String(collection.ownedSkins.length).padStart(2, '0')}</span></button>${(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => `<button data-action="filter-skins" data-value="${rarity}" aria-pressed="false">${{ common: 'Comunes', rare: 'Raras', epic: 'Épicas', legendary: 'Legendarias' }[rarity]} <span>${SKINS.filter((skin) => skin.rarity === rarity).length}</span></button>`).join('')}</div><div class="skin-grid">${SKINS.map(
    (skin) => {
      const owned = collection.ownedSkins.includes(skin.id);
      const selected = profile.settings.skin === skin.id;
      const die = ARROW_DESIGNS[skin.id];
      return `<article class="skin-card rarity-${skin.rarity} ${selected ? 'selected' : ''}" data-collection-skin="${skin.id}" data-owned="${owned}" data-rarity="${skin.rarity}"><div class="skin-card-top"><span>${die.serial}</span><span class="skin-ownership">${selected ? 'EN USO' : owned ? 'EN PROPIEDAD' : 'POR DESCUBRIR'}</span></div><div class="skin-card-art" aria-hidden="true">${skinPreview(skin.id)}<span class="art-finish-line"></span></div><div class="skin-card-copy"><span class="eyebrow">${RARITY_LABELS[skin.rarity]}</span><h3>${skin.name}</h3><span class="skin-finish">${die.finish}</span></div><div class="skin-card-actions"><button class="secondary-button skin-equip" data-action="${owned ? 'skin' : 'craft-skin'}" data-value="${skin.id}" ${selected || (!owned && collection.shards < SKIN_COST[skin.rarity]) ? 'disabled' : ''}>${selected ? 'Equipada' : owned ? 'Equipar' : `Crear · ${SKIN_COST[skin.rarity]}`}</button></div><button class="skin-inspect" data-action="preview-skin" data-value="${skin.id}" aria-label="Inspeccionar ${skin.name}">${icon('zoom')}</button></article>`;
    },
  ).join(
    '',
  )}</div><p class="bonus-life-note">${icon('heart')} ${collection.lifeTokens} reservas de vida extra. Cada reserva añade una cuarta vida al siguiente intento clásico. Se consiguen en los niveles 4, 26 y 37 del pase gratuito.</p><h2 class="collection-themes-title">Temas del juego</h2>${themesContent(profile)}`;
}

export function skinInspector(profile: PlayerProfile, id: SkinId): string {
  const skin = SKINS.find((item) => item.id === id)!;
  const design = ARROW_DESIGNS[id];
  const owned = profile.economy.collection.ownedSkins.includes(id);
  const selected = profile.settings.skin === id;
  const affordable = profile.economy.collection.shards >= SKIN_COST[skin.rarity];
  return `<div class="skin-inspector rarity-${skin.rarity}"><div class="inspector-top"><span class="studio-kicker">${design.workshop}</span><button class="icon-button" data-action="close-overlay" aria-label="Cerrar inspector">${icon('close')}</button></div><div class="inspector-stage" data-inspector-stage="${design.exit}"><div class="inspector-crosshair"></div><span class="inspector-serial">${design.serial}</span><div class="inspector-glyph">${skinPreview(id)}</div><div class="inspector-trail" aria-hidden="true"></div><span class="inspector-scale">ESCALA 1:1 / DISEÑO ORIGINAL</span></div><div class="inspector-heading"><span class="rarity-label">${RARITY_LABELS[skin.rarity]}</span><h2>${skin.name}</h2><p>${design.finish}</p></div><p class="inspector-description">${design.description}</p><div class="inspector-spec"><span>FIRMA DE MOVIMIENTO</span><strong>${design.effect}</strong></div><button class="secondary-button" data-action="preview-skin-motion">${icon('play')} Probar animación</button><div class="inspector-directions" aria-label="Las cuatro direcciones">${(['up', 'right', 'down', 'left'] as const).map((direction) => `<span>${arrowArt(id, direction)}</span>`).join('')}</div><button class="primary-button" data-action="${owned ? 'skin' : 'craft-skin'}" data-value="${id}" ${selected || (!owned && !affordable) ? 'disabled' : ''}>${selected ? 'Equipada' : owned ? `Equipar ${skin.name}` : affordable ? `Crear · ${SKIN_COST[skin.rarity]} fragmentos` : `Necesitas ${SKIN_COST[skin.rarity]} fragmentos`}</button><p class="inspector-note">Solo cambia la apariencia. Todas las piezas conservan las mismas reglas.</p></div>`;
}

export function rewardsContent(
  profile: PlayerProfile,
  premium: boolean,
  tab: 'pass' | 'collection' | 'worlds',
  purchasesAvailable: boolean,
  preview = false,
): string {
  return `<section class="page-section rewards-page"><div class="eyebrow">${tab === 'collection' ? 'TALLER DE FLECHAS / SERIE 01' : tab === 'worlds' ? 'ESCENARIOS / EDICIONES DE EVENTO' : 'TEMPORADA 01 / CAMINOS'}</div><h1 class="page-title">${tab === 'collection' ? 'Tu colección.' : tab === 'worlds' ? 'Elige tu mundo.' : 'Pase de temporada.'}</h1><div class="rewards-tabs" role="group" aria-label="Recompensas"><button data-action="pass" class="${tab === 'pass' ? 'selected' : ''}" aria-pressed="${tab === 'pass'}">Pase de temporada</button><button data-action="worlds" class="${tab === 'worlds' ? 'selected' : ''}" aria-pressed="${tab === 'worlds'}">Fondos y eventos</button><button data-action="collection" class="${tab === 'collection' ? 'selected' : ''}" aria-pressed="${tab === 'collection'}">Colección</button></div>${tab === 'pass' ? passContent(profile, premium, purchasesAvailable, preview) : tab === 'worlds' ? worldGallery(profile) : collectionContent(profile)}</section>`;
}

export function chestContent(drop: ChestDrop): string {
  const skin = SKINS.find((item) => item.id === drop.skin)!;
  const design = ARROW_DESIGNS[skin.id];
  return `<div class="chest-reveal rarity-${skin.rarity}"><div class="drop-kicker"><span class="eyebrow">${drop.duplicate ? 'DUPLICADO · COMPENSACIÓN' : 'NUEVA SKIN'}</span><span>${design.serial}</span></div><div class="drop-display"><div class="drop-halo" aria-hidden="true"></div><span class="drop-workshop">${design.workshop}</span>${skinPreview(skin.id)}<span class="drop-edition">SERIE 01 / DISEÑO ORIGINAL</span></div><div class="drop-details"><span class="rarity-label">${RARITY_LABELS[skin.rarity]}</span><h2>${skin.name}</h2><span class="drop-finish">${design.finish}</span><p>${drop.duplicate ? `Ya forma parte de tu colección. Recibes ${drop.shards} fragmentos para crear otra pieza.` : 'Ya es tuya. Equípala para llevar su diseño y su firma de movimiento al tablero.'}</p>${drop.duplicate ? `<div class="duplicate-reward">${icon('spark')}<strong>+${drop.shards}</strong><span>FRAGMENTOS</span></div>` : `<div class="drop-effect"><span>FIRMA DE MOVIMIENTO</span><strong>${design.effect}</strong></div>`}<button class="primary-button" data-action="equip-drop">Equipar skin ${icon('check')}</button><button class="text-button centered" data-action="close-overlay">Volver a la colección</button><span class="drop-saved">${icon('check')} Guardada en tu colección</span></div></div>`;
}
