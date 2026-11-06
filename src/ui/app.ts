import { attemptMove } from '../core/game';
import { availableMoves } from '../core/board';
import { configForLevel } from '../generator/config';
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

type Screen = 'home' | 'modes' | 'game' | 'stats' | 'daily' | 'shared';
type Overlay = 'pause' | 'settings' | 'result' | 'onboarding' | 'hints' | 'conflict' | null;
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
  private readonly monetization = new MonetizationService();
  private pendingArrowFocus: string | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly store = new ProgressStore(),
  ) {
    store.onConflict = () => this.openOverlay('conflict');
    store.onError = () =>
      this.toast(
        'No se pudo guardar. Tu partida sigue abierta, pero revisa el almacenamiento del dispositivo.',
      );
    root.addEventListener('click', (event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-arrow]');
      if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
      if (target.dataset.arrow) {
        void this.selectArrow(target.dataset.arrow);
        return;
      }
      this.action(target.dataset.action ?? '', target.dataset.value);
    });
    root.addEventListener('keydown', (event) => this.handleKey(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.tick();
        this.pause();
        this.store.flush();
      }
      this.lastTick = performance.now();
    });
    window.addEventListener('pagehide', () => {
      this.tick();
      this.store.flush();
    });
    window.addEventListener('storage', (event) => {
      if (event.key === SAVE_KEY || event.key === null) this.store.detectConflict();
    });
    window.setInterval(() => this.tick(), 250);
    const incoming = readChallengeUrl(location.href);
    if (incoming.challenge) {
      this.challengeSpec = incoming.challenge;
      this.pendingShared = true;
      this.screen = 'shared';
    }
    this.render();
    bindNativeLifecycle(
      () => {
        this.tick();
        this.pause();
        this.store.flush();
        void this.store.whenIdle();
      },
      () => {
        if (this.overlay === 'conflict') return;
        if (
          this.overlay === 'settings' ||
          this.overlay === 'hints' ||
          this.overlay === 'onboarding'
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
  }

  private action(action: string, value?: string): void {
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
      case 'toggle':
        this.toggleSetting(value);
        break;
      case 'theme':
        this.store.profile.settings.theme = value === 'ember' ? 'ember' : 'aurora';
        this.visualSettingsDirty = true;
        this.store.flush();
        this.renderOverlay();
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
        configForLevel(level),
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
      this.challengeSpec = createChallenge(seed, { width, height: width, density, complexity });
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
      const text = `FLECHA TRAMPA · ${session.state.status === 'won' ? 'Camino despejado' : 'La salida sigue ahí'}\nTiempo: ${formatTime(session.elapsedMs)} · Errores: ${session.state.errors}\n¿Aceptas el reto?`;
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
    this.session = session;
    if (count || !session.counted) this.store.beginSession(session);
    this.screen = 'game';
    this.overlay = null;
    this.busy = false;
    this.lastTick = performance.now();
    this.store.flush();
    this.render();
  }

  private restart(): void {
    const previous = this.session;
    if (!previous) return;
    if (previous.mode === 'tutorial') {
      this.begin(tutorialSession());
      return;
    }
    this.begin(
      newSession(previous.mode, previous.level, previous.seed, previous.config, previous.date),
    );
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
    if (this.screen === 'game' && this.session?.state.status === 'playing' && !this.overlay)
      this.openOverlay('pause');
  }

  private tick(): void {
    const now = performance.now();
    const delta = Math.max(0, Math.min(now - this.lastTick, 1500));
    this.lastTick = now;
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
    if (!session || this.screen !== 'game' || this.overlay || this.busy || !this.renderer) return;
    const result = attemptMove(session.state, id);
    if (result.kind === 'ignored') return;
    this.tick();
    this.busy = true;
    this.pendingArrowFocus =
      document.activeElement instanceof HTMLElement && document.activeElement.dataset.arrow
        ? id
        : null;
    const epoch = this.epoch;
    session.state = result.state;
    if (result.kind === 'removed' && session.mode !== 'tutorial')
      this.store.profile.stats.arrowsCleared++;
    if (session.state.status !== 'playing') this.store.recordResult(session);
    this.store.flush();
    this.feedback.play(result.kind === 'removed' ? 'tap' : 'blocked', this.store.profile.settings);
    this.updateHud();
    if (result.kind === 'blocked') this.toast('Camino bloqueado. Busca qué flecha sale primero.');
    await this.renderer.animate(result);
    if (epoch !== this.epoch) return;
    if (this.store.conflicted) return;
    this.busy = false;
    this.updateHud();
    if (session.state.status !== 'playing') {
      this.finish();
      return;
    }
    if (session.mode === 'tutorial') this.highlightTutorial();
    if (document.hidden) this.pause();
  }

  private finish(): void {
    const session = this.session;
    if (!session) return;
    this.manualShareText = null;
    this.store.recordResult(session);
    if (session.state.status === 'won') this.feedback.play('win', this.store.profile.settings);
    this.openOverlay('result');
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
    if (!this.store.consumeHint()) return;
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
    this.epoch++;
    this.renderer?.destroy();
    this.renderer = null;
    document.documentElement.dataset.motion = this.store.profile.settings.reducedMotion
      ? 'reduced'
      : 'full';
    this.root.innerHTML = `<div class="app-shell ${this.screen === 'game' ? 'is-playing' : ''}">${this.header()}<main id="main-content">${this.content()}</main>${this.screen !== 'game' ? this.nav() : ''}<div class="overlay-layer"></div><div class="toast" role="status" aria-live="polite"></div></div>`;
    if (this.screen === 'game') void this.mountBoard();
    this.renderOverlay();
  }

  private header(): string {
    const game = this.screen === 'game';
    return `<header class="topbar"><button class="brand" data-action="${game ? 'pause' : 'home'}" aria-label="${game ? 'Pausar partida' : 'Ir al inicio'}"><span class="brand-mark">${icon('arrow')}</span><span>FLECHA<span class="brand-light">TRAMPA</span></span></button><div class="topbar-actions">${game ? `<span class="level-chip">${this.sessionLabel()}</span><button class="icon-button" data-action="pause" aria-label="Pausar">${icon('pause')}</button>` : `<span class="edition">UN RETO. TU RITMO.</span><button class="icon-button" data-action="settings" aria-label="Abrir ajustes">${icon('settings')}</button>`}</div></header>`;
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
    }
  }

  private homeContent(): string {
    const profile = this.store.profile;
    const continuing = profile.classicSave?.state.status === 'playing';
    return `<section class="home-hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> TU PRÓXIMA PEQUEÑA VICTORIA</div><h1>Piensa<br>la <span>salida.</span></h1><p class="hero-description">Cada flecha tiene un camino.<br>El truco es encontrar el orden.</p><button class="primary-button hero-play" data-action="play"><span>${continuing ? 'Continuar partida' : 'Jugar ahora'}<small>CLÁSICO <span>·</span> NIVEL ${String(profile.level).padStart(2, '0')}</small></span>${icon('diagonal')}</button><p class="hero-caption">${icon('heart')} Tres vidas. Cero prisas.</p></div><div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-caption">ENCUENTRA TU CAMINO</div>${['up', 'right', 'left', 'down', 'right', 'up', 'down', 'left', 'up'].map((direction, index) => `<div class="art-tile art-${index} direction-${direction}"><span>↑</span></div>`).join('')}<div class="art-tag">${icon('spark')} UN MOVIMIENTO LO CAMBIA TODO</div></div></section><section class="home-lower"><div class="section-heading"><span>Más formas de pensar</span><span class="micro-copy">ELIGE TU RETO</span></div><div class="mode-preview-grid"><button class="mode-preview daily-preview" data-action="daily"><span class="preview-icon">${icon('calendar')}</span><span><small>UNO CADA DÍA</small><strong>El reto de hoy</strong><span>Un nuevo día, una nueva salida.</span></span>${icon('diagonal')}</button><button class="mode-preview share-preview" data-action="shared"><span class="preview-icon">${icon('share')}</span><span><small>MEJOR EN COMPAÑÍA</small><strong>Reta a alguien</strong><span>El mismo puzle. ¿Otro camino?</span></span>${icon('diagonal')}</button></div><div class="home-footnote"><span class="tiny-dots"><i></i><i></i><i></i><i></i></span> Sin cuenta. Sin prisa. Con ingenio.</div></section>`;
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
      [formatTime(stats.totalPlayMs), 'Tiempo de juego', 'clock'],
      [stats.arrowsCleared, 'Flechas liberadas', 'arrow'],
      [hints, 'Pistas disponibles', 'spark'],
      [currentStreak(this.store.profile.daily), 'Racha diaria', 'flame'],
      [this.store.profile.daily.bestStreak, 'Mejor racha', 'calendar'],
      [this.store.profile.daily.completedDays, 'D?as completados', 'check'],
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
      return `<section class="page-section shared-page"><div class="eyebrow">UN POCO DE RIVALIDAD SANA</div><h1 class="page-title">Reta a<br>otra mente.</h1><p class="page-description">Crea un puzle que viaje en un enlace. Sin cuentas, sin complicaciones.</p><div class="challenge-form"><label for="challenge-seed">DALE UNA SEMILLA<input class="challenge-input" id="challenge-seed" maxlength="128" value="reto-${crypto.randomUUID().slice(0, 8)}" autocomplete="off" spellcheck="false" /></label><label for="challenge-size">TAMAÑO DEL TABLERO<select id="challenge-size">${[4, 5, 6, 7, 8, 9, 10].map((size) => `<option value="${size}" ${size === 5 ? 'selected' : ''}>${size} × ${size}</option>`).join('')}</select></label><div class="form-columns"><label for="challenge-density">DENSIDAD<select id="challenge-density"><option value="0.55">Ligera · 55 %</option><option value="0.7" selected>Media · 70 %</option><option value="0.85">Alta · 85 %</option></select></label><label for="challenge-complexity">COMPLEJIDAD<select id="challenge-complexity"><option value="0.35">Tranquila</option><option value="0.65" selected>Ingeniosa</option><option value="0.9">Exigente</option></select></label></div><p class="form-error" data-challenge-error role="alert"></p><button class="primary-button" data-action="shared-create">Crear mi reto ${icon('spark')}</button></div><p class="daily-fineprint">Misma semilla y parámetros, mismo tablero. Los resultados se guardan en cada dispositivo; no existe un ranking global.</p></section>`;
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
    return `<section class="page-section shared-page"><div class="eyebrow">${this.pendingShared ? 'TE HAN INVITADO A PENSAR' : 'TU RETO ESTÁ LISTO'}</div><h1 class="page-title">El mismo reto.<br>Otra mente.</h1><p class="page-description">La salida será la misma. La forma de encontrarla, muy tuya.</p><div class="challenge-ready"><div class="challenge-symbol">${icon('share')}</div><span class="challenge-seed-label">SEMILLA DEL RETO</span><h2>${escapeHtml(spec.seed)}</h2><p>${spec.config.width} × ${spec.config.height} · ${Math.round(spec.config.width * spec.config.height * spec.config.density)} flechas · Complejidad ${Math.round(spec.config.complexity * 100)} %</p><button class="primary-button" data-action="shared-play">${continuing ? 'Continuar este reto' : 'Jugar este reto'} ${icon('play')}</button><div class="share-buttons"><button class="secondary-button" data-action="share-challenge" ${!url ? 'disabled' : ''}>Compartir ${icon('share')}</button><button class="secondary-button" data-action="copy-challenge" ${!url ? 'disabled' : ''}>Copiar enlace ${icon('copy')}</button></div><label class="share-url-label" for="challenge-url">ENLACE REPRODUCIBLE<input id="challenge-url" readonly value="${escapeHtml(url)}" aria-label="Enlace del reto" /></label>${configError ? `<p class="form-error">${escapeHtml(configError)}</p>` : ''}</div><button class="text-button centered" data-action="shared-reset">Crear otro reto ${icon('retry')}</button>${isLocal ? '<p class="daily-fineprint">Este enlace usa la dirección local del juego. Para abrirlo en otro dispositivo, publica el juego y configura su URL pública.</p>' : '<p class="daily-fineprint">Cualquiera con el enlace puede jugar el mismo tablero. No necesita cuenta ni servidor de partidas.</p>'}</section>`;
  }

  private gameContent(): string {
    const session = this.session!;
    const tutorial = session.mode === 'tutorial';
    return `<section class="game-layout"><div class="game-intro"><div class="eyebrow">${tutorial ? 'APRENDER HACIENDO' : session.mode === 'classic' ? 'MODO CLÁSICO' : session.mode === 'daily' ? 'DESAFÍO DIARIO' : 'RETO COMPARTIDO'}</div><h1 class="game-title">${tutorial ? 'Todo tiene<br> un orden.' : 'Una flecha.<br> Un paso más.'}</h1><p class="game-description">Observa el tablero. Libera los caminos.<br>La siguiente salida está ahí.</p><div class="desktop-tip">${icon('help')}<p>Una flecha solo puede salir si no hay otra en su trayectoria. Cada intento bloqueado cuesta una vida.</p></div></div><div class="play-area"><div class="game-hud"><div class="lives" role="img" aria-label="3 vidas" data-lives></div><span class="game-timer">${icon('clock')}<span data-timer>${formatTime(session.elapsedMs)}</span></span></div><div class="board-frame"><div class="board-corner corner-tl"></div><div class="board-corner corner-br"></div><div class="board-host" aria-hidden="true"></div><div class="board-controls" role="group" aria-label="Tablero de flechas"></div><div class="board-loading">Preparando tu camino…</div></div><div class="board-progress"><span>FLECHAS LIBERADAS</span><strong data-counter></strong><div class="progress-track"><i data-progress></i></div></div><div class="tutorial-instruction" ${tutorial ? '' : 'hidden'}></div><div class="game-tools"><button class="hint-button" data-action="hint">${icon('spark')}<span>Una pista</span><span class="hint-count" data-hints>${this.store.profile.hints}</span></button><button class="text-button" data-action="pause">Tomar un respiro ${icon('pause')}</button></div><p class="board-caption">${icon('arrow')} Toca una flecha para liberarla.</p></div></section>`;
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
        (id) => {
          void this.selectArrow(id);
        },
      );
      await this.renderer.ready;
      if (epoch !== this.epoch) return;
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
      lives.innerHTML = [0, 1, 2]
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
      controls.innerHTML = board.arrows
        .map(
          (arrow) =>
            `<button class="board-cell" data-arrow="${escapeHtml(arrow.id)}" data-x="${arrow.x}" data-y="${arrow.y}" data-direction="${arrow.direction}" aria-label="Flecha ${DIRECTION_LABEL[arrow.direction]}, fila ${arrow.y + 1}, columna ${arrow.x + 1}" style="left:${(((720 - board.width * cell) / 2 + arrow.x * cell) / 720) * 100}%;top:${(((720 - board.height * cell) / 2 + arrow.y * cell) / 720) * 100}%;width:${(cell / 720) * 100}%;height:${(cell / 720) * 100}%" ${this.busy || this.overlay ? 'disabled' : ''}></button>`,
        )
        .join('');
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
    ]
      .map(
        ([screen, glyph, label]) =>
          `<button data-action="${screen}" class="nav-item ${activeScreen === screen ? 'active' : ''}" ${activeScreen === screen ? 'aria-current="page"' : ''}>${icon(glyph!)}<span>${label}</span></button>`,
      )
      .join('')}<span class="nav-signature">FLECHA TRAMPA <small>v0.1</small></span></nav>`;
  }

  private openOverlay(overlay: Overlay): void {
    if (this.overlay === 'conflict' && overlay !== 'conflict') return;
    this.tick();
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.overlay = overlay;
    this.store.flush();
    this.renderOverlay();
    if (this.screen === 'game') this.updateHud();
  }

  private closeOverlay(): void {
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
    const layer = this.root.querySelector<HTMLElement>('.overlay-layer');
    if (!layer) return;
    const focused =
      document.activeElement instanceof HTMLElement && layer.contains(document.activeElement)
        ? {
            action: document.activeElement.dataset.action,
            value: document.activeElement.dataset.value,
          }
        : null;
    const main = this.root.querySelector<HTMLElement>('main');
    if (main) main.inert = this.overlay !== null;
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
        )}</div><div class="theme-heading">PALETA DE FLECHAS</div><div class="theme-options">${[
        ['aurora', 'Aurora'],
        ['ember', 'Atardecer'],
      ]
        .map(
          ([name, label]) =>
            `<button data-action="theme" data-value="${name}" class="theme-option ${settings.theme === name ? 'selected' : ''}" aria-pressed="${settings.theme === name}"><span class="theme-swatches ${name}"><i></i><i></i><i></i><i></i></span>${label}${settings.theme === name ? icon('check') : ''}</button>`,
        )
        .join(
          '',
        )}</div><button class="text-button centered" data-action="tutorial">${icon('help')} Repetir tutorial</button><p class="settings-footer">FLECHA TRAMPA · v0.1.0<br>Tu progreso se queda en este dispositivo.</p>`;
    }
    if (this.overlay === 'hints')
      content = `${close}<div class="modal-symbol lavender">${icon('spark')}</div><h2>Tu ingenio<br>también recarga.</h2><p>No te quedan pistas. Cada tres victorias conseguirás una nueva. ${this.monetization.ads.rewardedAvailable ? 'Puedes obtener otra viendo un anuncio recompensado.' : 'Los anuncios recompensados todavía no están disponibles.'}</p>${this.monetization.ads.rewardedAvailable ? `<button class="secondary-button" data-action="rewarded-hint">Ver anuncio por una pista ${icon('spark')}</button>` : ''}<button class="primary-button" data-action="close-overlay">Seguir pensando ${icon('arrow')}</button>`;
    if (this.overlay === 'result') content = this.resultContent();
    layer.innerHTML = `<div class="modal-backdrop"><section class="modal-card ${this.overlay === 'result' ? 'result-card' : ''}" role="dialog" aria-modal="true" aria-label="${this.overlay === 'settings' ? 'Ajustes' : this.overlay === 'result' ? 'Resultado de la partida' : this.overlay === 'pause' ? 'Partida en pausa' : 'FLECHA TRAMPA'}">${content}</section></div>`;
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
    return `<div class="result-burst ${won ? '' : 'defeat'}">${icon(won ? 'spark' : 'retry')}</div><div class="eyebrow">${won ? (tutorial ? 'YA TIENES LA CLAVE' : 'CAMINO DESPEJADO') : 'TÓMATE OTRO INTENTO'}</div><h2>${won ? (tutorial ? 'Ahora, a<br>tu manera.' : session.state.errors === 0 ? 'Así de<br>impecable.' : 'Una pequeña<br>gran victoria.') : 'La salida<br>sigue ahí.'}</h2><p>${won ? (tutorial ? 'Busca caminos libres. Cada flecha que sale abre nuevas posibilidades.' : session.state.errors === 0 ? 'Ni un solo error. A veces, todo encaja.' : 'Has encontrado el orden. Disfruta ese momento.') : 'Tres vidas después, ya conoces mejor el tablero. ¿Lo vuelves a intentar?'}</p><div class="result-stats"><div><strong>${formatTime(session.elapsedMs)}</strong><span>TIEMPO</span></div><div><strong>${session.state.errors}</strong><span>ERRORES</span></div><div><strong>${session.state.totalArrows - session.state.board.arrows.length}</strong><span>FLECHAS</span></div></div>${won && !tutorial && this.store.profile.stats.wins % 3 === 0 ? '<div class="reward-note">+1 pista · Cada victoria abre caminos.</div>' : ''}<button class="primary-button" data-action="${nextAction}">${nextLabel} ${icon(won ? 'arrow' : 'retry')}</button>${!tutorial ? `<button class="secondary-button" data-action="share-result">Compartir resultado ${icon('share')}</button>` : ''}${this.manualShareText ? `<textarea class="manual-copy" readonly aria-label="Resultado para copiar">${escapeHtml(this.manualShareText)}</textarea>` : ''}<button class="text-button centered" data-action="home">Volver al inicio</button>`;
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.overlay === 'settings' || this.overlay === 'hints') this.closeOverlay();
      else if (this.overlay === 'pause') this.closeOverlay();
      else this.pause();
    }
    if (event.key !== 'Tab' || !this.overlay) return;
    const buttons = [
      ...this.root.querySelectorAll<HTMLElement>('.modal-card button:not([disabled])'),
    ];
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
