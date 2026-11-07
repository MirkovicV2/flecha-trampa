import { isBoard } from '../core/board';
import { GENERATOR_VERSION, isLevelConfig } from '../generator/config';
import { arrowCount, containsCell } from '../generator/shapes';
import { solve } from '../solver/solver';
import type { PlayerProfile } from './progress';
import type { PlaySession } from './session';
import { defaultDailyProgress, isDailyProgress, isUtcDate } from './daily';
import { integer, isRecord, nonNegative } from '../utils/validation';
import { isSkinId } from '../config/collection';
import { isThemeName } from '../config/theme';
import { PASS_SEASON } from '../config/pass';
import { defaultEconomy } from './economy';
import { defaultEvents, isWorldId, WORLD_NAMES } from '../config/worlds';

function isEconomy(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isRecord(value.energy) ||
    !isRecord(value.pass) ||
    !isRecord(value.collection)
  )
    return false;
  const { energy, pass, collection } = value;
  return (
    integer(energy.amount, 0, 99) &&
    integer(energy.updatedAt) &&
    pass.season === PASS_SEASON &&
    integer(pass.xp, 0, 1000000) &&
    Array.isArray(pass.claimed) &&
    pass.claimed.length <= 20 &&
    new Set(pass.claimed).size === pass.claimed.length &&
    pass.claimed.every(
      (key: unknown) =>
        typeof key === 'string' &&
        /^(free|premium):([1-9]|10)$/.test(key) &&
        Number(key.split(':')[1]) * 100 <= Number(pass.xp),
    ) &&
    Array.isArray(collection.ownedSkins) &&
    collection.ownedSkins.length <= 8 &&
    collection.ownedSkins.includes('classic') &&
    collection.ownedSkins.every(isSkinId) &&
    new Set(collection.ownedSkins).size === collection.ownedSkins.length &&
    Array.isArray(collection.ownedThemes) &&
    collection.ownedThemes.length <= 6 &&
    collection.ownedThemes.includes('aurora') &&
    collection.ownedThemes.every(isThemeName) &&
    new Set(collection.ownedThemes).size === collection.ownedThemes.length &&
    integer(collection.lifeTokens, 0, 99) &&
    integer(collection.shards, 0, 99999) &&
    integer(collection.chests, 0, 999) &&
    integer(collection.opened) &&
    integer(collection.sinceEpic, 0, 9)
  );
}

const text = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;

export function isSavedSession(
  value: unknown,
  mode: 'classic' | 'daily' | 'shared' = 'classic',
): value is PlaySession {
  if (
    !isRecord(value) ||
    value.mode !== mode ||
    !text(value.id) ||
    !text(value.seed) ||
    !integer(value.level, 1)
  )
    return false;
  if (
    value.generatorVersion !== GENERATOR_VERSION ||
    typeof value.counted !== 'boolean' ||
    typeof value.recorded !== 'boolean' ||
    !nonNegative(value.elapsedMs)
  )
    return false;
  if (
    !isLevelConfig(value.config) ||
    !isBoard(value.initialBoard) ||
    !isRecord(value.state) ||
    !isBoard(value.state.board)
  )
    return false;
  const currentBoard = value.state.board;
  const { state, initialBoard, config } = value;
  if (
    value.lifeTokenSpent !== undefined &&
    (typeof value.lifeTokenSpent !== 'boolean' ||
      (value.lifeTokenSpent && (mode !== 'classic' || !value.counted || state.initialLives !== 4)))
  )
    return false;
  if (state.initialLives !== undefined && state.initialLives !== 3 && state.initialLives !== 4)
    return false;
  if (
    value.energySpent !== undefined &&
    (typeof value.energySpent !== 'boolean' ||
      (value.energySpent && (!value.counted || mode === 'shared')))
  )
    return false;
  if (value.rewardXp !== undefined && !integer(value.rewardXp, 0, 175)) return false;
  if (
    config.width !== initialBoard.width ||
    config.height !== initialBoard.height ||
    initialBoard.arrows.length < 1
  )
    return false;
  if (
    initialBoard.arrows.length !== arrowCount(config) ||
    initialBoard.arrows.some(
      ({ x, y }) => !containsCell(config.width, config.height, config.shape ?? 'square', x, y),
    )
  )
    return false;
  if (currentBoard.width !== initialBoard.width || currentBoard.height !== initialBoard.height)
    return false;
  if (
    (value.date !== null && !isUtcDate(value.date)) ||
    (mode === 'daily' && !isUtcDate(value.date))
  )
    return false;
  if (
    !integer(state.lives, 0, Number(state.initialLives ?? 3)) ||
    !integer(state.errors, 0, Number(state.initialLives ?? 3)) ||
    state.lives !== Number(state.initialLives ?? 3) - state.errors ||
    ![3, ...(mode === 'classic' ? [4] : [])].includes(Number(state.initialLives ?? 3))
  )
    return false;
  if (state.totalArrows !== initialBoard.arrows.length || !integer(state.moves)) return false;
  const remaining = currentBoard.arrows.length;
  if (state.moves !== initialBoard.arrows.length - remaining + state.errors) return false;
  const expectedStatus = state.lives === 0 ? 'lost' : remaining === 0 ? 'won' : 'playing';
  if (
    state.status !== expectedStatus ||
    (state.lives === 0 && remaining === 0) ||
    (value.recorded && state.status === 'playing')
  )
    return false;
  const originals = new Map(initialBoard.arrows.map((arrow) => [arrow.id, arrow]));
  for (const arrow of currentBoard.arrows) {
    const original = originals.get(arrow.id);
    if (
      !original ||
      original.x !== arrow.x ||
      original.y !== arrow.y ||
      original.direction !== arrow.direction
    )
      return false;
  }
  return solve(initialBoard).solvable && solve(currentBoard).solvable;
}

export function decodeProfile(serialized: string | null): PlayerProfile | null {
  if (!serialized || serialized.length > 500000) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.schema !== 1 ||
      !text(value.runId) ||
      !integer(value.level, 1) ||
      !integer(value.hints, 0, 99) ||
      typeof value.tutorialDone !== 'boolean'
    )
      return null;
    if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value.runId))
      return null;
    if (value.classicSave !== null && !isSavedSession(value.classicSave)) return null;
    if (value.dailySave === undefined) value.dailySave = null;
    if (value.daily === undefined) value.daily = defaultDailyProgress();
    if (value.sharedSave === undefined) value.sharedSave = null;
    if (value.sharedSave !== null && !isSavedSession(value.sharedSave, 'shared')) return null;
    if (
      (value.dailySave !== null && !isSavedSession(value.dailySave, 'daily')) ||
      !isDailyProgress(value.daily)
    )
      return null;
    if (
      !isRecord(value.settings) ||
      typeof value.settings.sound !== 'boolean' ||
      typeof value.settings.haptics !== 'boolean' ||
      typeof value.settings.reducedMotion !== 'boolean' ||
      !isThemeName(value.settings.theme)
    )
      return null;
    if (value.settings.skin === undefined) value.settings.skin = 'classic';
    if (value.settings.world === undefined) value.settings.world = 'void';
    if (!isWorldId(value.settings.world)) return null;
    if (value.events === undefined) value.events = defaultEvents();
    if (
      !isRecord(value.events) ||
      !integer(value.events.stamps, 0, 99999) ||
      !integer(value.events.earned, 0, 99999) ||
      value.events.stamps > value.events.earned ||
      !Array.isArray(value.events.ownedWorlds) ||
      !value.events.ownedWorlds.includes('void') ||
      value.events.ownedWorlds.length > WORLD_NAMES.length ||
      !value.events.ownedWorlds.every(isWorldId) ||
      new Set(value.events.ownedWorlds).size !== value.events.ownedWorlds.length
    )
      return null;
    if (!value.events.ownedWorlds.includes(value.settings.world)) value.settings.world = 'void';
    if (!isSkinId(value.settings.skin)) return null;
    if (value.economy === undefined) value.economy = defaultEconomy();
    if (
      isRecord(value.economy) &&
      isRecord(value.economy.collection) &&
      value.economy.collection.lifeTokens === undefined
    )
      value.economy.collection.lifeTokens = 0;
    if (!isEconomy(value.economy)) return null;
    const economy = value.economy as unknown as PlayerProfile['economy'];
    if (!economy.collection.ownedSkins.includes(value.settings.skin))
      value.settings.skin = 'classic';
    if (!economy.collection.ownedThemes.includes(value.settings.theme))
      value.settings.theme = 'aurora';
    const stats = value.stats;
    if (
      !isRecord(stats) ||
      !integer(stats.played) ||
      !integer(stats.wins) ||
      !integer(stats.flawless) ||
      !integer(stats.arrowsCleared) ||
      !nonNegative(stats.totalPlayMs)
    )
      return null;
    if (stats.flawless > stats.wins || stats.wins > stats.played) return null;
    if (stats.bestCombo === undefined) stats.bestCombo = 0;
    if (!integer(stats.bestCombo, 0, 100)) return null;
    return value as unknown as PlayerProfile;
  } catch {
    return null;
  }
}
