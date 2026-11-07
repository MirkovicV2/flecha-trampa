import { attemptMove } from '../core/game';
import { availableMoves } from '../core/board';
import { configForLevel, classicConfigForLevel } from '../generator/config';
import { BOARD_SHAPES, SHAPE_LABELS, arrowCount, isBoardShape } from '../generator/shapes';
import { FeedbackService } from '../services/feedback';
import { ProgressStore, SAVE_KEY } from '../services/progress';
import { currentStreak, dailyChallenge, dailyCountdown, utcDate } from '../services/daily';
import { buildChallengeUrl, createChallenge, readChallengeUrl } from '../services/challenges';
import type { ChallengeSpec } from '../services/challenges';
import { ShareService } from '../services/share';
import { MonetizationService } from '../services/monetization';
import { bindNativeLifecycle, minimizeNativeApp } from '../services/platform';
import { newSession, tutorialSession } from '../services/session';
import type { PlaySession } from '../services/session';
import type { BoardRenderer } from '../scenes/BoardScene';
import { escapeHtml, formatTime } from '../utils/format';
import { icon } from './icons';
import { BoardInput } from './board-input';
import { advanceCombo, COMBO_WINDOW_MS, emptyCombo } from '../core/combo';
import { rewardsContent, themesContent, rewardLabel, skinInspector } from './rewards';
import { isThemeName } from '../config/theme';
import { isSkinId } from '../config/collection';
import type { SkinId } from '../config/collection';
import { PASS_TIERS, parseRewardKey } from '../config/pass';
import { rewardClaimMotion } from './reward-claim';
import { energyWaitMs, regenerateEnergy } from '../services/energy';
import type { ChestDrop } from '../services/economy';
import { isWorldId } from '../config/worlds';
import type { WorldId } from '../config/worlds';
import { worldArt } from './world-art';
import { worldPreview } from './worlds';
import { CommercePreviewView } from './commerce-preview';
import { PreviewAdsService, PreviewPurchasesService } from '../services/preview-commerce';
import { PREVIEW_PURCHASE_KEY } from '../services/preview-commerce';
import { comboStage } from '../config/combos';
import { ComboEffects } from './combo-effects';
import { SkinMotionPreview } from './skin-motion';
import { ChestOpening, chestOpeningContent } from './chest-opening';
import { homeScreen } from './home';
import { gameScreen } from './game-screen';
import { RouteInspector } from './route-inspector';
import { masteryContent } from './mastery';
import { mastery } from '../core/mastery';
import { version } from '../../package.json';

type Screen = 'home' | 'modes' | 'game' | 'stats' | 'daily' | 'shared' | 'rewards';
type Overlay =
  | 'pause'
  | 'settings'
  | 'result'
  | 'onboarding'
  | 'hints'
  | 'conflict'
  | 'energy'
  | 'chest'
  | 'world-preview'
  | 'skin-preview'
  | null;
const DIRECTION_LABEL = { up: 'arriba', right: 'derecha', down: 'abajo', left: 'izquierda' };

export class GameApp {
  private screen: Screen = 'home';
  private overlay: Overlay = null;
  private session: PlaySession | null = null;
  private renderer: BoardRenderer | null = null;
  private busy = false;
  private epoch = 0;
  private lastTick = performance.now();
  private lastSave = 0;
  private toastTimer = 0;
  private readonly feedback = new FeedbackService();
  private previousFocus: HTMLElement | null = null;
  private visualSettingsDirty = false;
  private displayedDailyDate = utcDate();
  private challengeSpec: ChallengeSpec | null = null;
  private pendingShared = false;
  private readonly shareService = new ShareService();
  private sharing = false;
  private manualShareText: string | null = null;
  private readonly monetization: MonetizationService;
  private readonly commerceView: CommercePreviewView;
  private readonly commercePreview: boolean;
  private readonly effects: ComboEffects;
  private pendingArrowFocus: string | null = null;
  private readonly blockedArrows = new Set<string>();
  private combo = emptyCombo();
  private rewardsTab: 'pass' | 'collection' | 'worlds' = 'pass';
  private previewWorld: WorldId = 'christmas';
  private chestDrop: ChestDrop | null = null;
  private chestOpening: ChestOpening | null = null;
  private previewSkin: SkinId = 'classic';
  private readonly skinMotion = new SkinMotionPreview();
  private energyReturn: Overlay = null;
  private pendingEnergySession: PlaySession | null = null;
  private purchasing = false;
  private readonly routes: RouteInspector;
  private inspecting = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly store = new ProgressStore(),
  ) {
    this.routes = new RouteInspector(root);
    this.commerceView = new CommercePreviewView(root);
    this.effects = new ComboEffects(root);
    this.commercePreview = (import.meta.env.VITE_MONETIZATION_MODE ?? 'preview') === 'preview';
    this.monetization = this.commercePreview
      ? new MonetizationService(
          new PreviewAdsService(this.commerceView),
          new PreviewPurchasesService(this.commerceView),
        )
      : new MonetizationService();
    store.onConflict = () => {
      this.commerceView.cancel();
      this.openOverlay('conflict');
    };
    store.onError = () =>
      this.toast(
        'No se pudo guardar. Tu partida sigue abierta, pero revisa el almacenamiento del dispositivo.',
      );
    root.addEventListener('click', (event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-arrow]');
      if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
      if (target.dataset.arrow) {
        return;
      }
      this.action(target.dataset.action ?? '', target.dataset.value);
    });
    new BoardInput(
      root,
      (id) => {
        if (this.inspecting) this.inspectRoute(id);
        else void this.selectArrow(id);
      },
      (id) => this.inspectRoute(id),
    );
    root.addEventListener('keydown', (event) => this.handleKey(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.chestOpening?.skip(true);
        this.skinMotion.clear();
        this.feedback.stopChest();
        this.tick();
        this.pause();
        this.store.flush();
      }
      this.lastTick = performance.now();
      // Run after Phaser's own visibility listener, which can wake its frame loop.
      queueMicrotask(() => {
        this.renderer?.setPaused(this.overlay !== null || document.hidden);
        document.documentElement.dataset.effectsPaused = String(
          this.overlay !== null || document.hidden,
        );
      });
    });
    window.addEventListener('pagehide', () => {
      this.chestOpening?.skip(true);
      this.feedback.stopChest();
      this.tick();
      this.store.flush();
    });
    window.addEventListener('storage', (event) => {
      if (event.key === SAVE_KEY || event.key === null) this.store.detectConflict();
      if (event.key === PREVIEW_PURCHASE_KEY || event.key === null) void this.refreshPurchases();
    });
    window.setInterval(() => this.tick(), 250);
    const incoming = readChallengeUrl(location.href);
    if (incoming.challenge) {
      this.challengeSpec = incoming.challenge;
      this.pendingShared = true;
      this.screen = 'shared';
    }
    window.addEventListener('hashchange', () => {
      if (this.store.conflicted) return;
      const incoming = readChallengeUrl(location.href);
      if (incoming.error) this.toast(incoming.error);
      if (!incoming.challenge) return;
      this.commerceView.cancel();
      this.challengeSpec = incoming.challenge;
      this.pendingShared = true;
      this.go('shared');
    });
    this.render();
    bindNativeLifecycle(
      () => {
        this.commerceView.cancel();
        this.chestOpening?.skip(true);
        this.feedback.stopChest();
        this.tick();
        this.pause();
        this.store.flush();
        void this.store.whenIdle();
      },
      () => {
        if (this.commerceView.active) {
          this.commerceView.cancel();
          return;
        }
        if (this.overlay === 'conflict') return;
        if (
          this.overlay === 'settings' ||
          this.overlay === 'hints' ||
          this.overlay === 'onboarding' ||
          this.overlay === 'energy' ||
          this.overlay === 'chest' ||
          this.overlay === 'skin-preview' ||
          this.overlay === 'world-preview'
        )
          this.closeOverlay();
        else if (this.overlay || (this.screen !== 'home' && this.screen !== 'game'))
          this.go('home');
        else if (this.screen === 'game') this.pause();
        else minimizeNativeApp();
      },
    );
    if (!this.store.profile.tutorialDone) this.openOverlay('onboarding');
    if (!this.store.available)
      this.toast(
        'Guardado no disponible: este navegador conservará la partida solo mientras siga abierta.',
      );
    else if (this.store.recovery === 'backup')
      this.toast('Hemos recuperado la última copia válida de tu progreso.');
    else if (this.store.recovery === 'reset')
      this.toast('El guardado estaba dañado. Se ha iniciado un nuevo progreso local.');
    if (incoming.error) this.toast(incoming.error);
    void this.refreshPurchases();
  }

  private action(action: string, value?: string): void {
    if (this.commerceView.active) return;
    if (
      this.overlay === 'chest' &&
      !['skip-chest', 'chest-sound', 'equip-drop', 'close-overlay', 'reload'].includes(action)
    )
      return;
    if (this.store.conflicted && action !== 'reload') return;
    switch (action) {
      case 'reload':
        location.reload();
        break;
      case 'home':
        this.go('home');
        break;
      case 'modes':
        this.go('modes');
        break;
      case 'daily':
        this.go('daily');
        break;
      case 'daily-play':
        this.playDaily();
        break;
      case 'shared':
        this.go('shared');
        break;
      case 'shared-create':
        this.createShared();
        break;
      case 'shared-play':
        this.playShared();
        break;
      case 'shared-reset':
        this.challengeSpec = null;
        this.pendingShared = false;
        history.replaceState(null, '', location.pathname + location.search);
        this.render();
        break;
      case 'copy-challenge':
        void this.shareChallenge(true);
        break;
      case 'share-challenge':
        void this.shareChallenge(false);
        break;
      case 'share-result':
        void this.shareResult();
        break;
      case 'stats':
        this.go('stats');
        break;
      case 'rewards':
      case 'pass':
      case 'collection':
      case 'worlds':
        this.rewardsTab =
          action === 'collection' ? 'collection' : action === 'worlds' ? 'worlds' : 'pass';
        this.go('rewards');
        break;
      case 'preview-world':
        if (isWorldId(value)) {
          this.previewWorld = value;
          this.openOverlay('world-preview');
        }
        break;
      case 'unlock-world':
      case 'equip-world':
        if (
          isWorldId(value) &&
          (action === 'equip-world' || this.store.unlockWorld(value)) &&
          this.store.equipWorld(value)
        ) {
          this.overlay = null;
          this.render();
          this.toast(
            action === 'unlock-world'
              ? 'Fondo desbloqueado y equipado. ¡Es tuyo para siempre!'
              : 'Fondo equipado. Tu mundo, a tu manera.',
          );
        }
        break;
      case 'energy':
        this.energyReturn = this.overlay;
        this.openOverlay('energy');
        break;
      case 'practice':
        this.practice();
        break;
      case 'retry-energy':
        if (this.pendingEnergySession) this.begin(this.pendingEnergySession);
        break;
      case 'claim-reward': {
        const parsed = parseRewardKey(value);
        if (!parsed) break;
        const { track, tier } = parsed;
        if (this.store.claimPassReward(tier, track)) {
          this.render();
          rewardClaimMotion(
            this.root,
            tier,
            track,
            this.store.profile.settings.reducedMotion ||
              matchMedia('(prefers-reduced-motion: reduce)').matches,
          );
          this.toast(`Recogido: ${rewardLabel(PASS_TIERS[tier - 1]![track])}.`);
        }
        break;
      }
      case 'pass-chapter':
        this.root.querySelector(`[data-pass-tier="${Number(value)}"]`)?.scrollIntoView({
          behavior:
            this.store.profile.settings.reducedMotion ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          block: 'start',
        });
        break;
      case 'open-chest':
        if (!this.chestDrop) {
          this.chestDrop = this.store.openChest();
          if (this.chestDrop) this.openOverlay('chest');
        }
        break;
      case 'skip-chest':
        this.chestOpening?.skip();
        break;
      case 'chest-sound':
        this.store.profile.settings.sound = !this.store.profile.settings.sound;
        this.store.flush();
        this.chestOpening?.updateSound();
        break;
      case 'skin':
        if (isSkinId(value)) this.equipSkin(value);
        break;
      case 'preview-skin':
        if (isSkinId(value)) {
          this.previewSkin = value;
          this.openOverlay('skin-preview');
        }
        break;
      case 'preview-skin-motion':
        this.skinMotion.play(
          this.root,
          this.previewSkin,
          this.store.profile.settings.reducedMotion ||
            matchMedia('(prefers-reduced-motion: reduce)').matches,
        );
        break;
      case 'filter-skins':
        if (!['all', 'owned', 'common', 'rare', 'epic', 'legendary'].includes(value ?? '')) break;
        this.root.querySelectorAll<HTMLElement>('[data-collection-skin]').forEach((card) => {
          card.hidden =
            value === 'owned'
              ? card.dataset.owned !== 'true'
              : value !== 'all'
                ? card.dataset.rarity !== value
                : false;
        });
        this.root.querySelectorAll('[data-action="filter-skins"]').forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            String((button as HTMLElement).dataset.value === value),
          );
        });
        break;
      case 'craft-skin':
        if (isSkinId(value) && this.store.craftSkin(value)) this.equipSkin(value);
        break;
      case 'equip-drop':
        if (this.chestDrop && this.chestOpening?.revealed) this.equipSkin(this.chestDrop.skin);
        break;
      case 'buy-pass':
        void this.purchasePass();
        break;
      case 'restore-purchases':
        void this.refreshPurchases(true);
        break;
      case 'reset-preview':
        if (!this.purchasing && this.commercePreview) void this.resetPreview();
        break;
      case 'rewarded-energy':
        void this.rewardedEnergy();
        break;
      case 'play':
        this.playClassic();
        break;
      case 'tutorial':
        this.begin(tutorialSession());
        break;
      case 'skip-tutorial':
        this.store.profile.tutorialDone = true;
        this.store.flush();
        this.closeOverlay();
        break;
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.closeOverlay();
        break;
      case 'settings':
        this.openOverlay('settings');
        break;
      case 'close-overlay':
        this.closeOverlay();
        break;
      case 'restart':
        this.restart();
        break;
      case 'next':
        void this.advanceClassic();
        break;
      case 'rewarded-hint':
        void this.rewardedHint();
        break;
      case 'hint':
        this.hint();
        break;
      case 'zoom-board': {
        const viewport = this.root.querySelector('.board-viewport');
        const zoomed = viewport?.classList.toggle('zoomed') ?? false;
        const button = this.root.querySelector('[data-action="zoom-board"]');
        button?.setAttribute('aria-pressed', String(zoomed));
        if (button) button.textContent = zoomed ? 'Ver tablero completo' : 'Ampliar tablero';
        break;
      }
      case 'inspect-routes': {
        this.inspecting = !this.inspecting;
        this.routes.clear();
        this.root
          .querySelector('[data-action="inspect-routes"]')
          ?.setAttribute('aria-pressed', String(this.inspecting));
        const status = this.root.querySelector('[data-route-status]');
        if (this.inspecting && status)
          status.textContent =
            'Toca cualquier flecha para inspeccionar. Desactiva Rutas para jugar.';
        break;
      }
      case 'toggle':
        this.toggleSetting(value);
        break;
      case 'theme':
        if (
          !isThemeName(value) ||
          !this.store.profile.economy.collection.ownedThemes.includes(value)
        )
          break;
        this.store.profile.settings.theme = value;
        document.documentElement.dataset.theme = value;
        this.visualSettingsDirty = true;
        this.store.flush();
        if (this.screen === 'rewards') this.render();
        else this.renderOverlay();
        break;
      default:
        break;
    }
  }

  private playClassic(forceNext = false): void {
    if (!this.store.profile.tutorialDone) {
      this.begin(tutorialSession());
      return;
    }
    const saved = this.store.profile.classicSave;
    if (!forceNext && saved?.state.status === 'playing') {
      this.begin(saved, false);
      return;
    }
    const level = this.store.profile.level;
    this.begin(
      newSession(
        'classic',
        level,
        `classic:${this.store.profile.runId}:${level}`,
        classicConfigForLevel(level),
        null,
        this.store.hasPremium ? 4 : 3,
      ),
    );
  }

  private async advanceClassic(): Promise<void> {
    if (this.busy || !this.session || this.session.state.status !== 'won') return;
    this.busy = true;
    const epoch = this.epoch;
    await this.monetization.betweenLevels(this.session);
    if (epoch !== this.epoch) return;
    this.busy = false;
    this.playClassic(true);
  }

  private async rewardedHint(): Promise<void> {
    if (this.busy || this.overlay !== 'hints') return;
    this.busy = true;
    const result = await this.monetization.rewardedHint(() => {
      this.store.profile.hints = Math.min(99, this.store.profile.hints + 1);
      this.store.flush();
    });
    this.busy = false;
    if (result === 'granted') {
      this.closeOverlay();
      this.toast('Has recibido una pista.');
    } else if (result !== 'cancelled')
      this.toast('La recompensa no está disponible en este momento.');
  }

  private playDaily(): void {
    const challenge = dailyChallenge();
    const saved = this.store.profile.dailySave;
    if (saved?.date === challenge.date && saved.state.status === 'playing') {
      this.begin(saved, false);
      return;
    }
    this.begin(newSession('daily', 1, challenge.seed, challenge.config, challenge.date));
  }

  private createShared(): void {
    try {
      const seed = this.root.querySelector<HTMLInputElement>('#challenge-seed')?.value ?? '';
      const width = Number(this.root.querySelector<HTMLSelectElement>('#challenge-size')?.value);
      const density = Number(
        this.root.querySelector<HTMLSelectElement>('#challenge-density')?.value,
      );
      const complexity = Number(
        this.root.querySelector<HTMLSelectElement>('#challenge-complexity')?.value,
      );
      const shape = this.root.querySelector<HTMLSelectElement>('#challenge-shape')?.value;
      this.challengeSpec = createChallenge(seed, {
        width,
        height: width,
        density,
        complexity,
        ...(complexity === 1 ? { tuning: 'chain-v2' as const } : {}),
        ...(isBoardShape(shape) && shape !== 'square' ? { shape } : {}),
      });
      this.pendingShared = false;
      this.render();
    } catch (error) {
      const feedback = this.root.querySelector('[data-challenge-error]');
      if (feedback)
        feedback.textContent = error instanceof Error ? error.message : 'No se pudo crear el reto.';
    }
  }

  private playShared(): void {
    const spec = this.challengeSpec;
    if (!spec) return;
    const saved = this.store.profile.sharedSave;
    this.pendingShared = false;
    if (
      saved?.state.status === 'playing' &&
      saved.seed === spec.seed &&
      JSON.stringify(saved.config) === JSON.stringify(spec.config)
    ) {
      this.begin(saved, false);
      return;
    }
    this.begin(newSession('shared', 1, spec.seed, spec.config));
  }

  private shareBaseUrl(): string {
    const configured: unknown = import.meta.env.VITE_PUBLIC_URL;
    return typeof configured === 'string' && configured.trim()
      ? configured.trim()
      : `${location.origin}${location.pathname}`;
  }

  private async shareChallenge(copyOnly: boolean): Promise<void> {
    if (!this.challengeSpec || this.sharing) return;
    this.sharing = true;
    try {
      const url = buildChallengeUrl(this.shareBaseUrl(), this.challengeSpec);
      const outcome = copyOnly
        ? await this.shareService.copy(url)
        : await this.shareService.share({
            title: 'FLECHA TRAMPA',
            text: 'El mismo puzle. ¿Encuentras otro camino?',
            url,
          });
      if (outcome === 'copied') this.toast('Enlace copiado. El reto ya tiene compañía.');
      if (outcome === 'shared') this.toast('Reto compartido.');
      if (outcome === 'manual') {
        const field = this.root.querySelector<HTMLInputElement>('#challenge-url');
        field?.focus();
        field?.select();
        this.toast('El navegador no permite copiar. Selecciona el enlace y cópialo manualmente.');
      }
    } catch (error) {
      this.toast(error instanceof Error ? error.message : 'No se pudo compartir.');
    } finally {
      this.sharing = false;
    }
  }

  private async shareResult(): Promise<void> {
    if (!this.session || this.sharing) return;
    this.sharing = true;
    const epoch = this.epoch;
    try {
      const session = this.session;
      const url = buildChallengeUrl(
        this.shareBaseUrl(),
        createChallenge(session.seed, session.config),
      );
      const text = `FLECHA TRAMPA · ${session.state.status === 'won' ? 'Camino despejado' : 'La salida sigue ahí'}\nTiempo: ${formatTime(session.elapsedMs)} · Errores: ${session.state.errors}\n${session.state.status === 'won' ? `${mastery(session.state, session.hintsUsed)} de 3 estrellas · ` : ''}Mejor combo ×${session.bestCombo ?? 0}\n¿Aceptas el reto?`;
      const outcome = await this.shareService.share({
        title: 'Mi resultado · FLECHA TRAMPA',
        text,
        url,
      });
      if (epoch !== this.epoch) return;
      if (outcome === 'copied') this.toast('Resultado y enlace copiados.');
      if (outcome === 'shared') this.toast('Resultado compartido.');
      if (outcome === 'manual') {
        this.manualShareText = `${text}\n${url}`;
        this.renderOverlay();
        this.toast('Selecciona el resultado para copiarlo manualmente.');
      }
    } catch (error) {
      this.toast(error instanceof Error ? error.message : 'No se pudo compartir.');
    } finally {
      this.sharing = false;
    }
  }

  private begin(session: PlaySession, count = true): void {
    this.tick();
    if ((count || !session.counted) && !this.store.beginSession(session)) {
      if (!this.store.conflicted) {
        this.pendingEnergySession = session;
        if (this.overlay !== 'energy') this.energyReturn = this.overlay;
        this.openOverlay('energy');
      }
      return;
    }
    this.session = session;
    this.pendingEnergySession = null;
    this.screen = 'game';
    this.overlay = null;
    this.busy = false;
    this.combo = emptyCombo();
    this.lastTick = performance.now();
    this.store.flush();
    this.render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  private restart(): void {
    const previous = this.session;
    if (!previous) return;
    if (previous.mode === 'tutorial') {
      this.begin(tutorialSession());
      return;
    }
    this.begin(
      newSession(
        previous.mode,
        previous.level,
        previous.seed,
        previous.config,
        previous.date,
        this.store.hasPremium ? 4 : 3,
      ),
    );
  }

  private practice(): void {
    const target = this.pendingEnergySession ?? this.session;
    const level = target?.level ?? this.store.profile.level;
    const seed = target?.seed ?? `practice:${this.store.profile.runId}:${level}`;
    const config = target?.config ?? configForLevel(level);
    this.challengeSpec = createChallenge(seed, config);
    this.begin(newSession('shared', level, seed, config));
  }

  private equipSkin(id: SkinId): void {
    if (!this.store.profile.economy.collection.ownedSkins.includes(id)) return;
    this.store.profile.settings.skin = id;
    this.visualSettingsDirty = true;
    this.store.flush();
    if (this.overlay === 'chest') this.closeOverlay();
    else {
      if (this.overlay === 'skin-preview') this.overlay = null;
      this.render();
    }
    this.toast('Skin equipada. Tu diseño y su animación ya están activos.');
  }

  private energyMarkup(): string {
    const energy = regenerateEnergy(
      this.store.profile.economy.energy,
      Date.now(),
      this.store.energyCapacity,
    );
    return `<button class="energy-chip" data-action="energy" aria-label="Energía: ${energy.amount} de ${this.store.energyCapacity}">${icon('energy')}<span data-energy-amount>${energy.amount}/${this.store.energyCapacity}</span></button>`;
  }

  private updateEnergy(): void {
    const now = Date.now();
    const energy = regenerateEnergy(
      this.store.profile.economy.energy,
      now,
      this.store.energyCapacity,
    );
    const wait = energyWaitMs(energy, now, this.store.energyCapacity);
    this.root.querySelectorAll('[data-energy-amount]').forEach((element) => {
      const value = `${energy.amount}/${this.store.energyCapacity}`;
      if (element.textContent !== value) element.textContent = value;
    });
    this.root.querySelectorAll('[data-energy-wait]').forEach((element) => {
      element.textContent = wait ? formatTime(wait) : '';
    });
    this.root
      .querySelector('[data-action="energy"]')
      ?.setAttribute('aria-label', `Energía: ${energy.amount} de ${this.store.energyCapacity}`);
  }

  private async refreshPurchases(restore = false): Promise<void> {
    if (restore && this.purchasing) return;
    if (restore) this.purchasing = true;
    const epoch = this.epoch;
    try {
      const rights = restore
        ? await this.monetization.purchases.restore()
        : await this.monetization.purchases.entitlements();
      this.store.applyEntitlements(rights);
      if (epoch !== this.epoch) return;
      if (this.screen === 'rewards') this.render();
      else this.updateEnergy();
      if (restore)
        this.toast(
          this.store.hasPremium || rights.adsRemoved
            ? this.commercePreview
              ? 'Pase de prueba restaurado. Sin cobro real.'
              : 'Compras verificadas y restauradas.'
            : 'No hay compras disponibles para restaurar en esta versión.',
        );
    } catch {
      if (restore) this.toast('No se pudieron verificar las compras. Inténtalo más tarde.');
    } finally {
      if (restore) this.purchasing = false;
      this.updatePurchaseButtons();
    }
  }

  private updatePurchaseButtons(): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="buy-pass"]');
    if (!button) return;
    const available = !!this.monetization.purchases.available;
    button.disabled = this.purchasing || !available;
    button.textContent = available
      ? this.commercePreview
        ? 'Probar Pase Plus · 0 €'
        : 'Obtener Pase Plus'
      : 'Pase Plus · Próximamente';
    button.setAttribute('aria-busy', String(this.purchasing));
  }

  private async purchasePass(): Promise<void> {
    if (!this.monetization.purchases.available || this.purchasing) return;
    this.purchasing = true;
    this.updatePurchaseButtons();
    try {
      const result = await this.monetization.purchases.purchase('battle-pass');
      if (result === 'purchased') {
        await this.refreshPurchases();
        this.toast(
          this.store.hasPremium
            ? this.commercePreview
              ? 'Pase Plus de prueba activado. No se ha cobrado nada.'
              : 'Pase Plus verificado y activado.'
            : 'La tienda aún no ha confirmado el pase. Prueba Restaurar compras.',
        );
      } else if (result === 'unavailable') this.toast('El Pase Plus aún no está disponible.');
      else if (result === 'cancelled' && this.commercePreview)
        this.toast('Compra de prueba cancelada. No se ha cobrado nada.');
    } catch {
      this.toast('La compra no se pudo completar.');
    } finally {
      this.purchasing = false;
      this.updatePurchaseButtons();
    }
  }

  private async resetPreview(): Promise<void> {
    this.purchasing = true;
    try {
      await this.monetization.purchases.resetPreview?.();
      await this.refreshPurchases();
      this.renderOverlay();
      this.toast('Pase de prueba restablecido. Los intersticiales vuelven a estar activos.');
    } catch {
      this.toast('No se pudo restablecer la prueba.');
    } finally {
      this.purchasing = false;
      this.updatePurchaseButtons();
    }
  }

  private async rewardedEnergy(): Promise<void> {
    if (this.busy || this.overlay !== 'energy') return;
    this.busy = true;
    const result = await this.monetization.rewardedEnergy(() => {
      const energy = regenerateEnergy(
        this.store.profile.economy.energy,
        Date.now(),
        this.store.energyCapacity,
      );
      this.store.profile.economy.energy = { ...energy, amount: Math.min(99, energy.amount + 1) };
      this.store.flush();
    });
    this.busy = false;
    if (result === 'granted') {
      this.renderOverlay();
      this.toast('+1 carga de energía.');
    } else if (result !== 'cancelled') this.toast('La recompensa no está disponible.');
  }

  private go(screen: Screen): void {
    if (this.busy) return;
    this.tick();
    this.store.flush();
    if (screen === 'shared' && !this.challengeSpec && this.store.profile.sharedSave)
      this.challengeSpec = createChallenge(
        this.store.profile.sharedSave.seed,
        this.store.profile.sharedSave.config,
      );
    if (screen === 'home') {
      this.pendingShared = false;
      history.replaceState(null, '', location.pathname + location.search);
    }
    this.screen = screen;
    this.overlay = null;
    this.render();
    window.scrollTo({ top: 0 });
  }

  private pause(): void {
    this.routes.clear();
    this.combo = { ...this.combo, count: 0, lastMoveAt: 0 };
    this.effects.clear();
    this.updateCombo();
    if (this.screen === 'game' && this.session?.state.status === 'playing' && !this.overlay)
      this.openOverlay('pause');
  }

  private tick(): void {
    const now = performance.now();
    const delta = Math.max(0, Math.min(now - this.lastTick, 1500));
    this.lastTick = now;
    this.updateEnergy();
    if (this.combo.count && now - this.combo.lastMoveAt > COMBO_WINDOW_MS) {
      this.combo = { ...this.combo, count: 0 };
      this.updateCombo();
    } else if (this.combo.count) this.updateCombo();
    if (this.screen === 'daily') {
      if (this.displayedDailyDate !== utcDate()) {
        this.render();
        return;
      }
      const countdown = this.root.querySelector('[data-countdown]');
      if (countdown) countdown.textContent = dailyCountdown();
    }
    if (
      this.screen !== 'game' ||
      this.overlay ||
      !this.session ||
      this.session.state.status !== 'playing' ||
      document.hidden
    )
      return;
    this.store.addPlayTime(this.session, delta);
    const timer = this.root.querySelector('[data-timer]');
    if (timer) timer.textContent = formatTime(this.session.elapsedMs);
    if (now - this.lastSave > 1000) {
      this.lastSave = now;
      this.store.flush();
    }
  }

  private async selectArrow(id: string): Promise<void> {
    const session = this.session;
    if (
      !session ||
      this.screen !== 'game' ||
      this.overlay ||
      this.busy ||
      !this.renderer ||
      this.blockedArrows.has(id)
    )
      return;
    this.routes.clear();
    const availableBefore = new Set(availableMoves(session.state.board).map((arrow) => arrow.id));
    const result = attemptMove(session.state, id);
    if (result.kind === 'ignored') return;
    const hitRect = this.root.querySelector(`[data-arrow="${id}"]`)?.getBoundingClientRect();
    this.tick();
    if (result.kind === 'blocked') this.blockedArrows.add(id);
    this.combo = advanceCombo(this.combo, result.kind === 'removed', performance.now());
    session.bestCombo = Math.max(session.bestCombo ?? 0, this.combo.count);
    this.pendingArrowFocus =
      document.activeElement instanceof HTMLElement && document.activeElement.dataset.arrow
        ? id
        : null;
    const epoch = this.epoch;
    session.state = result.state;
    if (result.kind === 'removed' && session.mode !== 'tutorial') {
      this.store.profile.stats.arrowsCleared++;
      this.store.profile.stats.bestCombo = Math.max(
        this.store.profile.stats.bestCombo,
        this.combo.best,
      );
    }
    if (session.state.status !== 'playing') this.store.recordResult(session);
    this.store.flush();
    this.feedback.play(
      result.kind === 'removed' ? 'tap' : 'blocked',
      this.store.profile.settings,
      this.combo.count,
    );
    this.updateHud();
    if (result.kind === 'removed') {
      for (const arrow of availableMoves(session.state.board)) {
        if (availableBefore.has(arrow.id)) continue;
        const button = this.root.querySelector(`[data-arrow="${arrow.id}"]`);
        button?.classList.add('just-unlocked');
        window.setTimeout(() => button?.classList.remove('just-unlocked'), 650);
      }
    } else this.routes.show(session.state.board, id, true);
    this.updateCombo(true);
    if (result.kind === 'removed' && hitRect)
      this.effects.hit(
        this.combo.count,
        this.store.profile.settings,
        { x: hitRect.x + hitRect.width / 2, y: hitRect.y + hitRect.height / 2 },
        session.state.status === 'won',
      );
    else if (result.kind === 'blocked') this.effects.clear();
    if (result.kind === 'blocked') this.toast('Camino bloqueado. Busca qué flecha sale primero.');
    await this.renderer.animate(result, this.combo.count);
    if (epoch !== this.epoch) return;
    this.blockedArrows.delete(id);
    if (this.store.conflicted) return;
    this.updateHud();
    if (result.state.status !== 'playing') {
      this.finish();
      return;
    }
    if (session.mode === 'tutorial') this.highlightTutorial();
    if (document.hidden) this.pause();
  }

  private finish(): void {
    const session = this.session;
    if (!session) return;
    this.effects.clear();
    this.manualShareText = null;
    this.store.recordResult(session);
    if (session.state.status === 'won') this.feedback.play('win', this.store.profile.settings);
    this.openOverlay('result');
  }

  private inspectRoute(id: string | null): void {
    if (id === null) {
      this.routes.clear();
      return;
    }
    if (
      this.busy ||
      this.overlay ||
      this.screen !== 'game' ||
      !this.session ||
      this.session.state.status !== 'playing'
    )
      return;
    this.routes.show(this.session.state.board, id);
  }

  private hint(): void {
    if (
      this.busy ||
      this.overlay ||
      !this.session ||
      !this.renderer ||
      this.session.state.status !== 'playing'
    )
      return;
    if (this.store.profile.hints <= 0) {
      this.openOverlay('hints');
      return;
    }
    const valid = availableMoves(this.session.state.board)[0];
    if (!valid) return;
    if (!this.store.consumeHint(this.session)) return;
    this.updateHud();
    this.renderer.hint(valid.id);
    const button = this.root.querySelector<HTMLElement>(`[data-arrow="${valid.id}"]`);
    button?.classList.add('hinted');
    window.setTimeout(() => button?.classList.remove('hinted'), 3000);
    this.toast('Esta flecha tiene el camino libre.');
  }

  private toggleSetting(value?: string): void {
    if (value !== 'sound' && value !== 'haptics' && value !== 'reducedMotion') return;
    const settings = this.store.profile.settings;
    settings[value] = !settings[value];
    if (value === 'reducedMotion') this.visualSettingsDirty = true;
    document.documentElement.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
    this.store.flush();
    this.renderOverlay();
    if (value === 'sound' && settings.sound) this.feedback.play('tap', settings);
  }

  private render(): void {
    this.routes.clear();
    this.inspecting = false;
    this.disposeChest();
    this.skinMotion.clear();
    this.effects.clear();
    this.epoch++;
    this.blockedArrows.clear();
    this.renderer?.destroy();
    this.renderer = null;
    document.documentElement.dataset.theme = this.store.profile.settings.theme;
    document.documentElement.dataset.world = this.store.profile.settings.world;
    document.documentElement.dataset.motion = this.store.profile.settings.reducedMotion
      ? 'reduced'
      : 'full';
    this.root.innerHTML = `<div class="world-backdrop" aria-hidden="true">${worldArt(this.store.profile.settings.world)}${this.store.profile.settings.world !== 'void' ? `<div class="world-landscape">${worldArt(this.store.profile.settings.world)}</div>` : ''}</div><div class="app-shell ${this.screen === 'game' ? 'is-playing' : ''}">${this.header()}${this.commercePreview ? '<div class="preview-notice" role="note">ANUNCIOS Y COMPRAS DE PRUEBA <span>· SIN COBRO</span></div>' : ''}<main id="main-content">${this.content()}</main>${this.screen !== 'game' ? this.nav() : ''}<div class="overlay-layer"></div><div class="toast" role="status" aria-live="polite"></div></div>`;
    if (this.screen === 'game') void this.mountBoard();
    this.renderOverlay();
  }

  private header(): string {
    const game = this.screen === 'game';
    return `<header class="topbar"><button class="brand" data-action="${game ? 'pause' : 'home'}" aria-label="${game ? 'Pausar partida' : 'Ir al inicio'}"><span class="brand-mark">${icon('arrow')}</span><span>FLECHA<span class="brand-light">TRAMPA</span></span></button><div class="topbar-actions">${this.energyMarkup()}${game ? `<span class="level-chip">${this.sessionLabel()}</span><button class="icon-button" data-action="pause" aria-label="Pausar">${icon('pause')}</button>` : `<span class="edition">UN RETO. TU RITMO.</span><button class="icon-button" data-action="settings" aria-label="Abrir ajustes">${icon('settings')}</button>`}</div></header>`;
  }

  private content(): string {
    switch (this.screen) {
      case 'home':
        return this.homeContent();
      case 'modes':
        return this.modesContent();
      case 'stats':
        return this.statsContent();
      case 'daily':
        return this.dailyContent();
      case 'shared':
        return this.sharedContent();
      case 'game':
        return this.gameContent();
      case 'rewards':
        return rewardsContent(
          this.store.profile,
          this.store.hasPremium,
          this.rewardsTab,
          !!this.monetization.purchases.available && !this.purchasing,
          this.commercePreview,
        );
    }
  }

  private homeContent(): string {
    return homeScreen(this.store.profile, this.store.hasPremium);
  }

  private modesContent(): string {
    return `<section class="page-section"><div class="eyebrow">CADA MENTE TIENE SU CAMINO</div><h1 class="page-title">A tu manera.</h1><p class="page-description">Elige cómo quieres poner a prueba tu ingenio.</p><div class="mode-list"><button class="mode-card" data-action="play"><span class="mode-number">01</span><div>${icon('grid')}<h2>Un poco más lejos.</h2><p>Niveles infinitos, dificultad progresiva y tres vidas para encontrar la salida.</p><span class="mode-label">CLÁSICO ${icon('arrow')}</span></div></button><button class="mode-card" data-action="daily"><span class="mode-number">02</span><div>${icon('calendar')}<h2>Una cita con tu ingenio.</h2><p>Un tablero al día, el mismo para todos. Suma pequeñas victorias y mantén tu racha.</p><span class="mode-label">DESAFÍO DIARIO ${icon('arrow')}</span></div></button><button class="mode-card" data-action="shared"><span class="mode-number">03</span><div>${icon('share')}<h2>Comparte el desafío.</h2><p>Crea un tablero, comparte el enlace y compara caminos. El mismo reto, otra mente.</p><span class="mode-label">RETOS COMPARTIDOS ${icon('arrow')}</span></div></button></div></section>`;
  }

  private statsContent(): string {
    const { stats, level, hints } = this.store.profile;
    return `<section class="page-section"><div class="eyebrow">CADA MOVIMIENTO CUENTA</div><h1 class="page-title">Tu camino.</h1><p class="page-description">Las pequeñas victorias también merecen su espacio.</p><div class="progress-hero">${icon('trophy')}<span>NIVEL ACTUAL</span><strong>${String(level).padStart(2, '0')}</strong><p>${level - 1} niveles clásicos superados</p></div><div class="stat-grid">${[
      [stats.played, 'Partidas jugadas', 'grid'],
      [stats.wins, 'Victorias', 'trophy'],
      [stats.flawless, 'Sin errores', 'shield'],
      [stats.mastered, 'Victorias de 3 estrellas', 'spark'],
      [formatTime(stats.totalPlayMs), 'Tiempo de juego', 'clock'],
      [stats.arrowsCleared, 'Flechas liberadas', 'arrow'],
      [hints, 'Pistas disponibles', 'spark'],
      [stats.bestCombo, 'Mejor combo', 'energy'],
      [currentStreak(this.store.profile.daily), 'Racha diaria', 'flame'],
      [this.store.profile.daily.bestStreak, 'Mejor racha', 'calendar'],
      [this.store.profile.daily.completedDays, 'Días completados', 'check'],
    ]
      .map(
        ([value, label, glyph]) =>
          `<div class="stat-card">${icon(String(glyph))}<strong>${value}</strong><span>${label}</span></div>`,
      )
      .join(
        '',
      )}</div><div class="info-note">${icon('shield')} Tu progreso vive en este dispositivo. No necesitas registrarte.</div></section>`;
  }

  private dailyContent(): string {
    const profile = this.store.profile;
    const today = utcDate();
    this.displayedDailyDate = today;
    const record = profile.daily.records[today];
    const continuing =
      profile.dailySave?.date === today && profile.dailySave.state.status === 'playing';
    const dateLabel = new Intl.DateTimeFormat('es', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${today}T12:00:00Z`));
    return `<section class="page-section daily-page"><div class="eyebrow">UNA NUEVA SALIDA CADA DÍA</div><h1 class="page-title">Hoy también<br>cuenta.</h1><p class="page-description">El mismo tablero para todos. Una pequeña cita con tu ingenio.</p><div class="daily-feature"><div class="daily-date">${icon('calendar')} ${escapeHtml(dateLabel)} <span>UTC</span></div><div class="daily-emblem">${icon(record?.completed ? 'check' : 'spark')}</div><h2>${record?.completed ? 'Tu reto de hoy, superado.' : '¿Encuentras el orden?'}</h2><p>7 × 7 · 33 flechas · Tres vidas</p>${record?.completed ? `<div class="daily-best"><span>MEJOR RESULTADO</span><strong>${formatTime(record.bestTimeMs ?? 0)} <small>· ${record.bestErrors} errores</small></strong></div>` : ''}<button class="primary-button" data-action="daily-play">${continuing ? 'Continuar el reto' : record?.completed ? 'Volver a jugar' : 'Aceptar el reto'} ${icon('arrow')}</button><div class="daily-countdown">Próximo reto en <strong data-countdown>${dailyCountdown()}</strong></div></div><div class="daily-streak"><span>${icon('flame')} <strong>${currentStreak(profile.daily)}</strong> días de racha</span><span>Mejor racha <strong>${profile.daily.bestStreak}</strong></span></div><p class="daily-fineprint">Se renueva a las 00:00 UTC. Tu tiempo, tus errores y tus días completados se guardan en este dispositivo.</p></section>`;
  }

  private sessionLabel(): string {
    const session = this.session;
    if (session?.mode === 'tutorial') return 'PRIMEROS PASOS';
    if (session?.mode === 'daily') return 'DIARIO · UTC';
    if (session?.mode === 'shared') return 'ENTRE AMIGOS';
    return `NIVEL ${String(session?.level ?? 1).padStart(2, '0')}`;
  }

  private sharedContent(): string {
    const spec = this.challengeSpec;
    if (!spec)
      return `<section class="page-section shared-page"><div class="eyebrow">UN POCO DE RIVALIDAD SANA</div><h1 class="page-title">Reta a<br>otra mente.</h1><p class="page-description">Crea un puzle que viaje en un enlace. Sin cuentas, sin complicaciones.</p><div class="challenge-form"><label for="challenge-seed">DALE UNA SEMILLA<input class="challenge-input" id="challenge-seed" maxlength="128" value="reto-${crypto.randomUUID().slice(0, 8)}" autocomplete="off" spellcheck="false" /></label><label for="challenge-size">TAMAÑO DEL TABLERO<select id="challenge-size">${[4, 5, 6, 7, 8, 9, 10].map((size) => `<option value="${size}" ${size === 5 ? 'selected' : ''}>${size} × ${size}</option>`).join('')}</select></label><label for="challenge-shape">FORMA DEL TABLERO<select id="challenge-shape">${BOARD_SHAPES.map((shape) => `<option value="${shape}">${SHAPE_LABELS[shape]}</option>`).join('')}</select></label><div class="form-columns"><label for="challenge-density">DENSIDAD<select id="challenge-density"><option value="0.55">Ligera · 55 %</option><option value="0.7" selected>Media · 70 %</option><option value="0.85">Alta · 85 %</option><option value="0.95">Extrema · 95 %</option></select></label><label for="challenge-complexity">COMPLEJIDAD<select id="challenge-complexity"><option value="0.35">Tranquila</option><option value="0.65" selected>Ingeniosa</option><option value="0.9">Exigente</option><option value="1">Maestro · Cadenas largas</option></select></label></div><p class="form-error" data-challenge-error role="alert"></p><button class="primary-button" data-action="shared-create">Crear mi reto ${icon('spark')}</button></div><p class="daily-fineprint">Misma semilla y parámetros, mismo tablero. Los resultados se guardan en cada dispositivo; no existe un ranking global.</p></section>`;
    let url = '';
    let configError = '';
    try {
      url = buildChallengeUrl(this.shareBaseUrl(), spec);
    } catch (error) {
      configError = error instanceof Error ? error.message : 'URL no disponible.';
    }
    const isLocal = url ? /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(url).hostname) : false;
    const continuing =
      this.store.profile.sharedSave?.seed === spec.seed &&
      this.store.profile.sharedSave.state.status === 'playing';
    return `<section class="page-section shared-page"><div class="eyebrow">${this.pendingShared ? 'TE HAN INVITADO A PENSAR' : 'TU RETO ESTÁ LISTO'}</div><h1 class="page-title">El mismo reto.<br>Otra mente.</h1><p class="page-description">La salida será la misma. La forma de encontrarla, muy tuya.</p><div class="challenge-ready"><div class="challenge-symbol">${icon('share')}</div><span class="challenge-seed-label">SEMILLA DEL RETO</span><h2>${escapeHtml(spec.seed)}</h2><p>${spec.config.width} × ${spec.config.height} · ${arrowCount(spec.config)} flechas · ${SHAPE_LABELS[spec.config.shape ?? 'square']} · Complejidad ${Math.round(spec.config.complexity * 100)} %</p><button class="primary-button" data-action="shared-play">${continuing ? 'Continuar este reto' : 'Jugar este reto'} ${icon('play')}</button><div class="share-buttons"><button class="secondary-button" data-action="share-challenge" ${!url ? 'disabled' : ''}>Compartir ${icon('share')}</button><button class="secondary-button" data-action="copy-challenge" ${!url ? 'disabled' : ''}>Copiar enlace ${icon('copy')}</button></div><label class="share-url-label" for="challenge-url">ENLACE REPRODUCIBLE<input id="challenge-url" readonly value="${escapeHtml(url)}" aria-label="Enlace del reto" /></label>${configError ? `<p class="form-error">${escapeHtml(configError)}</p>` : ''}</div><button class="text-button centered" data-action="shared-reset">Crear otro reto ${icon('retry')}</button>${isLocal ? '<p class="daily-fineprint">Este enlace usa la dirección local del juego. Para abrirlo en otro dispositivo, publica el juego y configura su URL pública.</p>' : '<p class="daily-fineprint">Cualquiera con el enlace puede jugar el mismo tablero. No necesita cuenta ni servidor de partidas.</p>'}</section>`;
  }

  private gameContent(): string {
    return gameScreen(this.session!, this.store.profile.hints);
  }

  private async mountBoard(): Promise<void> {
    const session = this.session;
    const host = this.root.querySelector<HTMLElement>('.board-host');
    if (!session || !host) return;
    const epoch = this.epoch;
    this.busy = true;
    try {
      const { BoardRenderer } = await import('../scenes/BoardScene');
      if (epoch !== this.epoch || !host.isConnected) return;
      this.renderer = new BoardRenderer(
        host,
        session.state.board,
        {
          ...this.store.profile.settings,
          reducedMotion:
            this.store.profile.settings.reducedMotion ||
            matchMedia('(prefers-reduced-motion: reduce)').matches,
        },
        session.config.shape,
      );
      await this.renderer.ready;
      if (epoch !== this.epoch) return;
      this.renderer.setPaused(this.overlay !== null || document.hidden);
      this.busy = false;
      this.visualSettingsDirty = false;
      this.root.querySelector('.board-loading')?.remove();
      this.updateHud();
      if (session.mode === 'tutorial') this.highlightTutorial();
    } catch {
      this.busy = false;
      const loading = this.root.querySelector('.board-loading');
      if (loading)
        loading.innerHTML =
          'No se pudo iniciar el tablero. <button class="text-button" data-action="restart">Volver a intentar</button>';
    }
  }

  private updateHud(): void {
    const session = this.session;
    if (!session) return;
    const lives = this.root.querySelector('[data-lives]');
    if (lives) {
      lives.innerHTML = Array.from({ length: session.state.initialLives ?? 3 }, (_, index) => index)
        .map(
          (index) =>
            `<span class="${index < session.state.lives ? 'heart-full' : 'heart-empty'}">${icon('heart')}</span>`,
        )
        .join('');
      lives.setAttribute('aria-label', `${session.state.lives} vidas`);
    }
    const count = this.root.querySelector('[data-counter]');
    const removed = session.state.totalArrows - session.state.board.arrows.length;
    if (count) count.textContent = `${removed} / ${session.state.totalArrows}`;
    const progress = this.root.querySelector<HTMLElement>('[data-progress]');
    if (progress) progress.style.width = `${(removed / session.state.totalArrows) * 100}%`;
    const hints = this.root.querySelector('[data-hints]');
    if (hints) hints.textContent = String(this.store.profile.hints);
    const controls = this.root.querySelector('.board-controls');
    if (controls) {
      const board = session.state.board;
      const cell = 664 / Math.max(board.width, board.height);
      const ids = new Set(board.arrows.map((arrow) => arrow.id));
      const existing = new Map(
        [...controls.querySelectorAll<HTMLButtonElement>('[data-arrow]')].map((button) => [
          button.dataset.arrow!,
          button,
        ]),
      );
      for (const [id, button] of existing) if (!ids.has(id)) button.remove();
      for (const arrow of board.arrows) {
        let button = existing.get(arrow.id);
        if (!button) {
          button = document.createElement('button');
          button.className = 'board-cell';
          Object.assign(button.dataset, {
            arrow: arrow.id,
            x: String(arrow.x),
            y: String(arrow.y),
            direction: arrow.direction,
          });
          button.setAttribute(
            'aria-label',
            `Flecha ${DIRECTION_LABEL[arrow.direction]}, fila ${arrow.y + 1}, columna ${arrow.x + 1}`,
          );
          Object.assign(button.style, {
            left: `${(((720 - board.width * cell) / 2 + arrow.x * cell) / 720) * 100}%`,
            top: `${(((720 - board.height * cell) / 2 + arrow.y * cell) / 720) * 100}%`,
            width: `${(cell / 720) * 100}%`,
            height: `${(cell / 720) * 100}%`,
          });
          controls.append(button);
        }
        button.disabled = this.busy || !!this.overlay || this.blockedArrows.has(arrow.id);
      }
    }
    this.root
      .querySelectorAll<HTMLButtonElement>('[data-action="pause"], [data-action="hint"]')
      .forEach((button) => {
        button.disabled = this.busy;
      });
    if (this.pendingArrowFocus && !this.busy && !this.overlay) {
      const next =
        this.root.querySelector<HTMLButtonElement>(`[data-arrow="${this.pendingArrowFocus}"]`) ??
        this.root.querySelector<HTMLButtonElement>('[data-arrow]');
      next?.focus({ preventScroll: true });
      this.pendingArrowFocus = null;
    }
  }

  private updateCombo(animate = false): void {
    const badge = this.root.querySelector<HTMLElement>('[data-combo]');
    if (!badge) return;
    const stage = comboStage(this.combo.count);
    const console = this.root.querySelector<HTMLElement>('.frenzy-console');
    const title = this.root.querySelector('[data-frenzy-title]');
    const count = this.root.querySelector('[data-frenzy-count]');
    const fuse = this.root.querySelector<HTMLElement>('[data-frenzy-fill]');
    if (console) {
      console.dataset.tier = stage.tier;
      console.style.setProperty('--combo-color', stage.color);
    }
    if (title) title.textContent = stage.name;
    if (count) count.textContent = this.combo.count > 1 ? `×${this.combo.count}` : '—';
    const remaining = this.combo.count
      ? Math.max(0, 1 - (performance.now() - this.combo.lastMoveAt) / COMBO_WINDOW_MS) * 100
      : 0;
    if (fuse) {
      fuse.style.width = `${remaining}%`;
      fuse.parentElement?.setAttribute('aria-valuenow', String(Math.round(remaining)));
    }
    badge.style.setProperty('--combo-color', stage.color);
    badge.hidden = this.combo.count < 2;
    badge.textContent = `COMBO ×${this.combo.count}`;
    badge.dataset.intensity = String(Math.min(5, this.combo.count));
    if (
      animate &&
      !this.store.profile.settings.reducedMotion &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches &&
      this.combo.count >= 2
    )
      badge.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 180 });
  }

  private highlightTutorial(): void {
    const session = this.session;
    if (!session || session.mode !== 'tutorial') return;
    const remaining = session.state.board.arrows.length;
    const messages = [
      '',
      '¡Última flecha! El camino ya está libre.',
      'Bien. Al salir, ha liberado el camino de otra.',
      'Empieza por la flecha de la derecha. Tiene la salida libre.',
    ];
    const instruction = this.root.querySelector('.tutorial-instruction');
    if (instruction)
      instruction.innerHTML = `<span>0${4 - remaining} / 03</span><p>${messages[remaining]}</p>`;
    const valid = availableMoves(session.state.board)[0];
    if (valid) {
      this.renderer?.hint(valid.id);
      this.root.querySelector(`[data-arrow="${valid.id}"]`)?.classList.add('hinted');
    }
  }

  private nav(): string {
    const activeScreen =
      this.screen === 'daily' || this.screen === 'shared' ? 'modes' : this.screen;
    return `<nav class="bottom-nav" aria-label="Navegación principal">${[
      ['home', 'home', 'Inicio'],
      ['modes', 'grid', 'Modos'],
      ['stats', 'chart', 'Tu progreso'],
      ['rewards', 'gift', 'Recompensas'],
    ]
      .map(
        ([screen, glyph, label]) =>
          `<button data-action="${screen}" class="nav-item ${activeScreen === screen ? 'active' : ''}" ${activeScreen === screen ? 'aria-current="page"' : ''}>${icon(glyph!)}<span>${label}</span></button>`,
      )
      .join('')}<span class="nav-signature">FLECHA TRAMPA <small>v${version}</small></span></nav>`;
  }

  private openOverlay(overlay: Overlay): void {
    this.routes.clear();
    if (this.overlay === 'conflict' && overlay !== 'conflict') return;
    if (overlay !== 'result') {
      this.effects.clear();
      this.combo = { ...this.combo, count: 0, lastMoveAt: 0 };
      this.updateCombo();
    }
    this.tick();
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.overlay = overlay;
    this.store.flush();
    this.renderOverlay();
    if (this.screen === 'game') this.updateHud();
  }

  private closeOverlay(): void {
    this.skinMotion.clear();
    if (this.overlay === 'chest') {
      if (this.chestOpening && !this.chestOpening.revealed) {
        this.chestOpening.skip();
        return;
      }
      this.disposeChest();
      this.chestDrop = null;
      this.overlay = null;
      this.render();
      return;
    }
    if (this.overlay === 'energy') {
      this.overlay = this.energyReturn;
      this.energyReturn = null;
      this.renderOverlay();
      if (this.screen === 'game') this.updateHud();
      return;
    }
    if (this.overlay === 'settings' && this.screen === 'game') this.overlay = 'pause';
    else this.overlay = null;
    this.lastTick = performance.now();
    if (!this.overlay && this.screen === 'game' && this.visualSettingsDirty) {
      this.visualSettingsDirty = false;
      this.render();
      return;
    }
    this.renderOverlay();
    if (this.screen === 'game') this.updateHud();
    if (!this.overlay) this.previousFocus?.focus();
  }

  private renderOverlay(): void {
    document.documentElement.dataset.effectsPaused = String(
      this.overlay !== null || document.hidden,
    );
    this.disposeChest();
    this.skinMotion.clear();
    this.renderer?.setPaused(this.overlay !== null || document.hidden);
    const layer = this.root.querySelector<HTMLElement>('.overlay-layer');
    if (!layer) return;
    const focused =
      document.activeElement instanceof HTMLElement && layer.contains(document.activeElement)
        ? {
            action: document.activeElement.dataset.action,
            value: document.activeElement.dataset.value,
          }
        : null;
    this.root.querySelectorAll<HTMLElement>('main, .topbar, .bottom-nav').forEach((element) => {
      element.inert = this.overlay !== null;
    });
    if (!this.overlay) {
      layer.innerHTML = '';
      return;
    }
    let content = '';
    const close = `<button class="icon-button modal-close" data-action="close-overlay" aria-label="Cerrar">${icon('close')}</button>`;
    if (this.overlay === 'onboarding')
      content = `<div class="modal-symbol lime">${icon('arrow')}</div><div class="eyebrow">BIENVENIDO A FLECHA TRAMPA</div><h2>Todo empieza<br>con una flecha.</h2><p>Libera las flechas en el orden correcto. Tres vidas, un tablero y tu ingenio.</p><button class="primary-button" data-action="tutorial">Aprender jugando ${icon('arrow')}</button><button class="text-button centered" data-action="skip-tutorial">Ya sé jugar</button>`;
    if (this.overlay === 'conflict')
      content = `<div class="modal-symbol lavender">${icon('shield')}</div><div class="eyebrow">PROGRESO PROTEGIDO</div><h2>Tu camino<br>ha continuado.</h2><p>Otra pestaña ha actualizado el progreso. Recarga para continuar desde el guardado más reciente.</p><button class="primary-button" data-action="reload">Recuperar el progreso ${icon('retry')}</button>`;
    if (this.overlay === 'pause')
      content = `<div class="modal-symbol lavender">${icon('pause')}</div><div class="eyebrow">SIN PRISA</div><h2>Un pequeño<br>respiro.</h2><p>Tu tablero te espera justo donde lo dejaste.</p><button class="primary-button" data-action="resume">Continuar ${icon('play')}</button><button class="secondary-button" data-action="restart">Reiniciar nivel ${icon('retry')}</button><div class="modal-links"><button class="text-button" data-action="settings">Ajustes</button><button class="text-button" data-action="home">Volver al inicio</button></div>`;
    if (this.overlay === 'settings') {
      const settings = this.store.profile.settings;
      content = `${close}<div class="eyebrow">A TU GUSTO</div><h2>Tu espacio.</h2><p>Pequeños detalles para pensar mejor.</p><div class="settings-list">${[
        ['sound', 'Sonido', 'Tonos suaves en cada movimiento'],
        ['haptics', 'Vibración', 'Una respuesta que se siente'],
        ['reducedMotion', 'Reducir movimiento', 'Animaciones más discretas'],
      ]
        .map(
          ([key, label, description]) =>
            `<button class="setting-row" data-action="toggle" data-value="${key}" role="switch" aria-checked="${settings[key as 'sound' | 'haptics' | 'reducedMotion']}"><span><strong>${label}</strong><small>${description}</small></span><span class="switch ${settings[key as 'sound' | 'haptics' | 'reducedMotion'] ? 'on' : ''}"></span></button>`,
        )
        .join(
          '',
        )}</div><button class="secondary-button" data-action="worlds">Fondos y eventos ${icon('gift')}</button><div class="theme-heading">PALETA DE FLECHAS</div>${themesContent(this.store.profile)}<button class="text-button centered" data-action="collection">Ver skins y cofres ${icon('chest')}</button><button class="text-button centered" data-action="tutorial">${icon('help')} Repetir tutorial</button>${this.commercePreview ? '<div class="preview-settings"><strong>Monetización de prueba</strong><p>Anuncios locales y pase sin cobro. Puedes restablecer el pase para volver a probar la compra y los intersticiales.</p><button class="secondary-button" data-action="reset-preview">Restablecer pase de prueba</button></div>' : ''}<p class="settings-footer">FLECHA TRAMPA · v0.4.0<br>Tu progreso se queda en este dispositivo.</p>`;
    }
    if (this.overlay === 'hints')
      content = `${close}<div class="modal-symbol lavender">${icon('spark')}</div><h2>Tu ingenio<br>también recarga.</h2><p>No te quedan pistas. Cada tres victorias conseguirás una nueva. ${this.monetization.ads.rewardedAvailable ? (this.commercePreview ? 'Puedes probar un anuncio recompensado sin publicidad real.' : 'Puedes obtener otra viendo un anuncio recompensado.') : 'Los anuncios recompensados todavía no están disponibles.'}</p>${this.monetization.ads.rewardedAvailable ? `<button class="secondary-button" data-action="rewarded-hint">${this.commercePreview ? 'Ver anuncio de prueba por una pista' : 'Ver anuncio por una pista'} ${icon('spark')}</button>` : ''}<button class="primary-button" data-action="close-overlay">Seguir pensando ${icon('arrow')}</button>`;
    if (this.overlay === 'result') content = this.resultContent();
    if (this.overlay === 'world-preview')
      content = worldPreview(this.store.profile, this.previewWorld);
    if (this.overlay === 'skin-preview')
      content = skinInspector(this.store.profile, this.previewSkin);
    if (this.overlay === 'chest' && this.chestDrop)
      content = chestOpeningContent(this.chestDrop, this.store.profile.settings.sound);
    if (this.overlay === 'energy') {
      const current = regenerateEnergy(
        this.store.profile.economy.energy,
        Date.now(),
        this.store.energyCapacity,
      );
      content = `${close}<div class="modal-symbol lime">${icon('energy')}</div><div class="eyebrow">TU ENERGÍA</div><h2>${current.amount ? 'Listo para<br>otro intento.' : 'Recarga y<br>vuelve a volar.'}</h2><strong class="energy-total" data-energy-amount>${current.amount} / ${this.store.energyCapacity}</strong><p>Cada intento nuevo clásico o diario cuesta 1 energía, ganes o pierdas. Continuar un guardado es gratis.</p><p class="energy-next">${current.amount >= this.store.energyCapacity ? 'Energía completa' : 'Próxima carga en'} <strong data-energy-wait></strong></p><p class="fine-print">Una carga cada 10 minutos, también con la app cerrada. Las bonificaciones pueden superar el límite.</p>${this.monetization.ads.rewardedAvailable ? `<button class="secondary-button" data-action="rewarded-energy">${this.commercePreview ? 'Ver anuncio de prueba por energía' : 'Ver anuncio por energía'}</button>` : ''}${this.pendingEnergySession ? '<button class="primary-button" data-action="retry-energy">Volver a intentar</button>' : ''}<button class="secondary-button" data-action="pass">Ver recompensas del pase</button><button class="text-button centered" data-action="practice">Practicar sin energía</button>`;
    }
    layer.innerHTML = `<div class="modal-backdrop"><section class="modal-card ${this.overlay === 'result' ? 'result-card' : this.overlay === 'skin-preview' ? 'skin-inspector-card' : this.overlay === 'chest' ? 'chest-opening-card' : ''}" role="dialog" aria-modal="true" aria-label="${this.overlay === 'settings' ? 'Ajustes' : this.overlay === 'skin-preview' ? 'Inspector de skin' : this.overlay === 'chest' ? 'Apertura de cofre' : this.overlay === 'result' ? 'Resultado de la partida' : this.overlay === 'pause' ? 'Partida en pausa' : 'FLECHA TRAMPA'}">${content}</section></div>`;
    if (this.overlay === 'chest' && this.chestDrop) {
      this.chestOpening = new ChestOpening(
        layer,
        this.chestDrop,
        () => this.store.profile.settings,
        (kind, drop) => this.feedback.chest(kind, this.store.profile.settings, drop.rarity),
      );
    }
    this.updateEnergy();
    window.requestAnimationFrame(() => {
      const match = focused?.action
        ? [...layer.querySelectorAll<HTMLElement>('button')].find(
            (button) =>
              button.dataset.action === focused.action && button.dataset.value === focused.value,
          )
        : null;
      (match ?? layer.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true });
    });
  }

  private disposeChest(): void {
    this.chestOpening?.dispose();
    this.chestOpening = null;
    this.feedback.stopChest();
  }

  private resultContent(): string {
    const session = this.session!;
    const won = session.state.status === 'won';
    const tutorial = session.mode === 'tutorial';
    const nextAction = won
      ? tutorial && this.pendingShared
        ? 'shared-play'
        : session.mode === 'daily'
          ? 'daily'
          : session.mode === 'shared'
            ? 'shared'
            : 'next'
      : 'restart';
    const nextLabel = won
      ? tutorial
        ? this.pendingShared
          ? 'Jugar el reto'
          : 'Empezar mi aventura'
        : session.mode === 'daily'
          ? 'Volver al desafío'
          : session.mode === 'shared'
            ? 'Volver al reto'
            : 'Siguiente nivel'
      : 'Volver a intentarlo';
    return `<div class="result-burst ${won ? '' : 'defeat'}">${icon(won ? 'spark' : 'retry')}</div><div class="eyebrow">${won ? (tutorial ? 'YA TIENES LA CLAVE' : 'CAMINO DESPEJADO') : 'TÓMATE OTRO INTENTO'}</div><h2>${won ? (tutorial ? 'Ahora, a<br>tu manera.' : session.state.errors === 0 ? 'Así de<br>impecable.' : 'Una pequeña<br>gran victoria.') : 'La salida<br>sigue ahí.'}</h2><p>${won ? (tutorial ? 'Busca caminos libres. Cada flecha que sale abre nuevas posibilidades.' : session.state.errors === 0 ? 'Ni un solo error. A veces, todo encaja.' : 'Has encontrado el orden. Disfruta ese momento.') : 'Ya conoces mejor el tablero. ¿Lo vuelves a intentar?'}</p>${masteryContent(session)}<div class="result-stats"><div><strong>${formatTime(session.elapsedMs)}</strong><span>TIEMPO</span></div><div><strong>${session.state.errors}</strong><span>ERRORES</span></div><div><strong>${session.state.totalArrows - session.state.board.arrows.length}</strong><span>FLECHAS</span></div></div>${won && !tutorial && this.store.profile.stats.wins % 3 === 0 ? '<div class="reward-note">+1 pista · Cada victoria abre caminos.</div>' : ''}${session.rewardXp ? `<div class="reward-note">+${session.rewardXp} XP para el pase${session.energySpent && session.energyPolicy !== 'attempt-v2' ? ' · Energía recuperada del intento antiguo' : ''}</div>` : ''}<button class="primary-button" data-action="${nextAction}">${nextLabel} ${icon(won ? 'arrow' : 'retry')}</button>${!tutorial ? `<button class="secondary-button" data-action="share-result">Compartir resultado ${icon('share')}</button>` : ''}${this.manualShareText ? `<textarea class="manual-copy" readonly aria-label="Resultado para copiar">${escapeHtml(this.manualShareText)}</textarea>` : ''}<button class="text-button centered" data-action="home">Volver al inicio</button>`;
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (
        this.overlay === 'settings' ||
        this.overlay === 'hints' ||
        this.overlay === 'chest' ||
        this.overlay === 'skin-preview' ||
        this.overlay === 'energy' ||
        this.overlay === 'world-preview'
      )
        this.closeOverlay();
      else if (this.overlay === 'pause') this.closeOverlay();
      else this.pause();
    }
    if (event.key !== 'Tab' || !this.overlay) return;
    const buttons = [
      ...this.root.querySelectorAll<HTMLElement>('.modal-card button:not([disabled])'),
    ].filter((button) => !button.closest('[hidden]') && button.getClientRects().length > 0);
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  private toast(message: string): void {
    const element = this.root.querySelector<HTMLElement>('.toast');
    if (!element) return;
    window.clearTimeout(this.toastTimer);
    element.textContent = message;
    element.classList.add('visible');
    this.toastTimer = window.setTimeout(() => element.classList.remove('visible'), 3200);
  }
}
