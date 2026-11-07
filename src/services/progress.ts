import { DEFAULT_SETTINGS } from '../config/theme';
import type { PlayerSettings } from '../config/theme';
import type { PlaySession } from './session';
import { decodeProfile } from './save-validation';
import { defaultDailyProgress, updateDaily } from './daily';
import type { DailyProgress } from './daily';
import { defaultEconomy, rollChest } from './economy';
import type { EconomyState, ChestDrop } from './economy';
import { ENERGY_CAPACITY, PREMIUM_ENERGY_CAPACITY, regenerateEnergy, spendEnergy } from './energy';
import { PASS_SEASON, PASS_TIERS, XP_PER_TIER } from '../config/pass';
import type { Reward } from '../config/pass';
import { SKINS, SKIN_COST, DUPLICATE_SHARDS } from '../config/collection';
import type { SkinId } from '../config/collection';
import type { Entitlements } from './purchases';
import { createGame } from '../core/game';
import { mastery } from '../core/mastery';
import { WORLDS, defaultEvents } from '../config/worlds';
import type { EventCollection, WorldId } from '../config/worlds';

export const SAVE_KEY = 'flecha-trampa:profile:v1';
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  whenIdle?(): Promise<void>;
}

export interface PlayerProfile {
  schema: 1;
  runId: string;
  level: number;
  hints: number;
  tutorialDone: boolean;
  settings: PlayerSettings;
  classicSave: PlaySession | null;
  dailySave: PlaySession | null;
  sharedSave: PlaySession | null;
  economy: EconomyState;
  events: EventCollection;
  daily: DailyProgress;
  stats: {
    played: number;
    wins: number;
    flawless: number;
    totalPlayMs: number;
    arrowsCleared: number;
    bestCombo: number;
    mastered: number;
  };
}

export function defaultProfile(): PlayerProfile {
  return {
    schema: 1,
    runId: crypto.randomUUID(),
    level: 1,
    hints: 3,
    tutorialDone: false,
    settings: { ...DEFAULT_SETTINGS },
    classicSave: null,
    dailySave: null,
    sharedSave: null,
    economy: defaultEconomy(),
    events: defaultEvents(),
    daily: defaultDailyProgress(),
    stats: {
      played: 0,
      wins: 0,
      flawless: 0,
      totalPlayMs: 0,
      arrowsCleared: 0,
      bestCombo: 0,
      mastered: 0,
    },
  };
}

function browserStorage(): StoragePort | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Versioned, validated saves with a last-known-good backup and a memory-only fallback. */
export class ProgressStore {
  readonly profile: PlayerProfile;
  available: boolean;
  recovery: 'none' | 'backup' | 'reset' = 'none';
  conflicted = false;
  onConflict: (() => void) | null = null;
  onError: (() => void) | null = null;
  private lastGood: string | null = null;
  private lastObserved: string | null = null;
  private premiumActive = false;

  get hasPremium(): boolean {
    return this.premiumActive;
  }
  get energyCapacity(): number {
    return this.premiumActive ? PREMIUM_ENERGY_CAPACITY : ENERGY_CAPACITY;
  }

  /** Paid rights come only from the purchase adapter, never from the saved profile. */
  applyEntitlements(entitlements: Entitlements): void {
    this.premiumActive = entitlements.battlePassSeason === PASS_SEASON;
  }

  constructor(private readonly storage: StoragePort | null = browserStorage()) {
    this.available = storage !== null;
    let loaded: PlayerProfile | null = null;
    if (storage) {
      try {
        const primary = storage.getItem(SAVE_KEY);
        this.lastObserved = primary;
        loaded = decodeProfile(primary);
        if (loaded) this.lastGood = primary;
        else {
          const backup = storage.getItem(`${SAVE_KEY}:backup`);
          loaded = decodeProfile(backup);
          if (loaded) {
            this.recovery = 'backup';
            this.lastGood = backup;
          } else if (primary || backup) this.recovery = 'reset';
        }
      } catch {
        this.available = false;
      }
    }
    this.profile = loaded ?? defaultProfile();
    // A page can close after the final move was saved and before its animation completed.
    for (const saved of [
      this.profile.classicSave,
      this.profile.dailySave,
      this.profile.sharedSave,
    ]) {
      if (saved && saved.state.status !== 'playing' && !saved.recorded) this.recordResult(saved);
    }
  }

  flush(): boolean {
    if (this.conflicted) return false;
    if (!this.storage) {
      this.available = false;
      return false;
    }
    if (this.detectConflict()) return false;
    try {
      const serialized = JSON.stringify(this.profile);
      if (serialized === this.lastGood) return this.available;
      if (this.lastGood) this.storage.setItem(`${SAVE_KEY}:backup`, this.lastGood);
      this.storage.setItem(SAVE_KEY, serialized);
      this.lastGood = serialized;
      this.lastObserved = serialized;
      this.available = true;
      return true;
    } catch {
      this.reportError();
      return false;
    }
  }

  detectConflict(): boolean {
    if (this.conflicted) return true;
    try {
      if (this.storage && this.storage.getItem(SAVE_KEY) !== this.lastObserved) {
        this.conflicted = true;
        this.onConflict?.();
      }
    } catch {
      this.reportError();
    }
    return this.conflicted;
  }

  reportError(): void {
    const previouslyAvailable = this.available;
    this.available = false;
    if (previouslyAvailable) this.onError?.();
  }

  async whenIdle(): Promise<void> {
    await this.storage?.whenIdle?.();
  }

  beginSession(session: PlaySession, now = Date.now()): boolean {
    if (this.conflicted || this.detectConflict()) return false;
    if (session.mode !== 'tutorial' && !session.counted) {
      if (session.mode !== 'shared') {
        const energy = spendEnergy(this.profile.economy.energy, now, this.energyCapacity);
        if (!energy) return false;
        this.profile.economy.energy = energy;
        session.energySpent = true;
        session.energyPolicy = 'attempt-v2';
      }
      if (session.mode === 'classic') {
        let lives: 3 | 4 = this.hasPremium ? 4 : 3;
        if (!this.hasPremium && this.profile.economy.collection.lifeTokens > 0) {
          this.profile.economy.collection.lifeTokens--;
          session.lifeTokenSpent = true;
          lives = 4;
        }
        session.state = createGame(session.initialBoard, lives);
      }
      session.counted = true;
      this.profile.stats.played++;
    }
    if (session.mode === 'classic') this.profile.classicSave = session;
    if (session.mode === 'daily') this.profile.dailySave = session;
    if (session.mode === 'shared') this.profile.sharedSave = session;
    this.flush();
    return true;
  }

  addPlayTime(session: PlaySession, milliseconds: number): void {
    if (!nonNegativeTime(milliseconds)) return;
    session.elapsedMs += milliseconds;
    if (session.mode !== 'tutorial') this.profile.stats.totalPlayMs += milliseconds;
  }

  consumeHint(session?: PlaySession): boolean {
    if (this.profile.hints < 1 || (session && session.state.status !== 'playing')) return false;
    this.profile.hints--;
    if (session) session.hintsUsed = Math.min(1000000, (session.hintsUsed ?? 0) + 1);
    this.flush();
    return true;
  }

  recordResult(session: PlaySession): void {
    if (session.recorded || session.state.status === 'playing') return;
    session.recorded = true;
    if (session.mode === 'tutorial') {
      if (session.state.status === 'won') this.profile.tutorialDone = true;
    } else if (session.state.status === 'won') {
      const firstClassic = session.mode === 'classic' && session.level >= this.profile.level;
      const firstDaily =
        session.mode === 'daily' &&
        session.date &&
        !this.profile.daily.records[session.date]?.completed;
      // Honor the one-charge refund promised to attempts saved by pre-0.6 apps.
      if (session.energySpent && session.energyPolicy !== 'attempt-v2') {
        const current = regenerateEnergy(
          this.profile.economy.energy,
          Date.now(),
          this.energyCapacity,
        );
        this.profile.economy.energy = { ...current, amount: Math.min(99, current.amount + 1) };
      }
      session.rewardXp =
        (firstClassic ? 100 : firstDaily ? 150 : 0) +
        ((firstClassic || firstDaily) && !session.state.errors ? 25 : 0);
      this.profile.economy.pass.xp = Math.min(
        1000000,
        this.profile.economy.pass.xp + session.rewardXp,
      );
      const stamps = firstClassic ? 1 : firstDaily ? 2 : 0;
      // Keep every cosmetic obtainable through play after the finite pass ends.
      if (firstClassic && session.level % 5 === 0 && this.profile.economy.collection.chests < 999) {
        session.rewardChests = 1;
        this.profile.economy.collection.chests = Math.min(
          999,
          this.profile.economy.collection.chests + 1,
        );
      }
      this.profile.events.stamps = Math.min(99999, this.profile.events.stamps + stamps);
      this.profile.events.earned = Math.min(99999, this.profile.events.earned + stamps);
      this.profile.stats.wins++;
      if (mastery(session.state, session.hintsUsed) === 3) this.profile.stats.mastered++;
      if (!session.state.errors) this.profile.stats.flawless++;
      if (this.profile.stats.wins % 3 === 0)
        this.profile.hints = Math.min(99, this.profile.hints + 1);
      if (session.mode === 'classic')
        this.profile.level = Math.max(this.profile.level, session.level + 1);
    }
    if (session.mode === 'daily' && session.date) {
      this.profile.daily = updateDaily(this.profile.daily, session.date, {
        won: session.state.status === 'won',
        timeMs: session.elapsedMs,
        errors: session.state.errors,
      });
    }
    this.flush();
  }

  claimPassReward(tier: number, track: 'free' | 'premium'): boolean {
    if (this.conflicted || this.detectConflict()) return false;
    const reward = PASS_TIERS.find((item) => item.tier === tier)?.[track];
    const pass = this.profile.economy.pass;
    const key = `${track}:${tier}`;
    if (
      !reward ||
      pass.xp < tier * XP_PER_TIER ||
      pass.claimed.includes(key) ||
      (track === 'premium' && !this.hasPremium)
    )
      return false;
    pass.claimed.push(key);
    this.grantReward(reward);
    this.flush();
    return true;
  }

  private grantReward(reward: Reward): void {
    const economy = this.profile.economy;
    const collection = economy.collection;
    if (reward.kind === 'stamps') {
      this.profile.events.stamps = Math.min(99999, this.profile.events.stamps + reward.amount);
      this.profile.events.earned = Math.min(99999, this.profile.events.earned + reward.amount);
    }
    if (reward.kind === 'energy') {
      economy.energy = regenerateEnergy(economy.energy, Date.now(), this.energyCapacity);
      economy.energy.amount = Math.min(99, economy.energy.amount + reward.amount);
    }
    if (reward.kind === 'hints')
      this.profile.hints = Math.min(99, this.profile.hints + reward.amount);
    if (reward.kind === 'chests')
      collection.chests = Math.min(999, collection.chests + reward.amount);
    if (reward.kind === 'shards')
      collection.shards = Math.min(99999, collection.shards + reward.amount);
    if (reward.kind === 'lives')
      collection.lifeTokens = Math.min(99, collection.lifeTokens + reward.amount);
    if (reward.kind === 'theme' && !collection.ownedThemes.includes(reward.id))
      collection.ownedThemes.push(reward.id);
    if (reward.kind === 'skin') {
      if (!collection.ownedSkins.includes(reward.id)) collection.ownedSkins.push(reward.id);
      else {
        const rarity = SKINS.find((skin) => skin.id === reward.id)!.rarity;
        collection.shards = Math.min(99999, collection.shards + DUPLICATE_SHARDS[rarity]);
      }
    }
  }

  openChest(random?: () => number): ChestDrop | null {
    if (this.conflicted || this.detectConflict()) return null;
    const drop = rollChest(this.profile.economy, random);
    if (drop) this.flush();
    return drop;
  }

  craftSkin(id: SkinId): boolean {
    if (this.conflicted || this.detectConflict()) return false;
    const skin = SKINS.find((item) => item.id === id);
    const collection = this.profile.economy.collection;
    if (!skin || collection.ownedSkins.includes(id) || collection.shards < SKIN_COST[skin.rarity])
      return false;
    collection.shards -= SKIN_COST[skin.rarity];
    collection.ownedSkins.push(id);
    this.flush();
    return true;
  }

  unlockWorld(id: WorldId): boolean {
    if (this.conflicted || this.detectConflict()) return false;
    const world = WORLDS.find((item) => item.id === id);
    const events = this.profile.events;
    if (!world || events.ownedWorlds.includes(id) || events.stamps < world.cost) return false;
    events.stamps -= world.cost;
    events.ownedWorlds.push(id);
    this.flush();
    return true;
  }

  equipWorld(id: WorldId): boolean {
    if (this.conflicted || this.detectConflict() || !this.profile.events.ownedWorlds.includes(id))
      return false;
    this.profile.settings.world = id;
    this.flush();
    return true;
  }
}

const nonNegativeTime = (value: number): boolean => Number.isFinite(value) && value >= 0;
