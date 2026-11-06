import { attemptMove } from '../core/game';
import { availableMoves } from '../core/board';
import { configForLevel } from '../generator/config';
import { FeedbackService } from '../services/feedback';
import { ProgressStore } from '../services/progress';
import { newSession, tutorialSession } from '../services/session';
import type { PlaySession } from '../services/session';
import type { BoardRenderer } from '../scenes/BoardScene';
import { escapeHtml, formatTime } from '../utils/format';
import { icon } from './icons';

type Screen = 'home' | 'modes' | 'game' | 'stats';
type Overlay = 'pause' | 'settings' | 'result' | 'onboarding' | 'hints' | null;
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

  constructor(private readonly root: HTMLElement, private readonly store = new ProgressStore()) {
    root.addEventListener('click', (event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-arrow]');
      if (!target || target instanceof HTMLButtonElement && target.disabled) return;
      if (target.dataset.arrow) { void this.selectArrow(target.dataset.arrow); return; }
      this.action(target.dataset.action ?? '', target.dataset.value);
    });
    root.addEventListener('keydown', (event) => this.handleKey(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.tick(); this.pause(); this.store.flush(); }
      this.lastTick = performance.now();
    });
    window.addEventListener('pagehide', () => { this.tick(); this.store.flush(); });
    window.setInterval(() => this.tick(), 250);
    this.render();
    if (!this.store.profile.tutorialDone) this.openOverlay('onboarding');
  }

  private action(action: string, value?: string): void {
    switch (action) {
      case 'home': this.go('home'); break;
      case 'modes': this.go('modes'); break;
      case 'stats': this.go('stats'); break;
      case 'play': this.playClassic(); break;
      case 'tutorial': this.begin(tutorialSession()); break;
      case 'skip-tutorial': this.store.profile.tutorialDone = true; this.store.flush(); this.closeOverlay(); break;
      case 'pause': this.pause(); break;
      case 'resume': this.closeOverlay(); break;
      case 'settings': this.openOverlay('settings'); break;
      case 'close-overlay': this.closeOverlay(); break;
      case 'restart': this.restart(); break;
      case 'next': this.playClassic(true); break;
      case 'hint': this.hint(); break;
      case 'toggle': this.toggleSetting(value); break;
      case 'theme': this.store.profile.settings.theme = value === 'ember' ? 'ember' : 'aurora'; this.visualSettingsDirty = true; this.store.flush(); this.renderOverlay(); break;
      default: break;
    }
  }

  private playClassic(forceNext = false): void {
    if (!this.store.profile.tutorialDone) { this.begin(tutorialSession()); return; }
    const saved = this.store.profile.classicSave;
    if (!forceNext && saved?.state.status === 'playing') { this.begin(saved, false); return; }
    const level = this.store.profile.level;
    this.begin(newSession('classic', level, `classic:${this.store.profile.runId}:${level}`, configForLevel(level)));
  }

  private begin(session: PlaySession, count = true): void {
    this.tick();
    this.session = session;
    if (count && session.mode !== 'tutorial') this.store.profile.stats.played++;
    if (session.mode === 'classic') this.store.profile.classicSave = session;
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
    if (previous.mode === 'tutorial') { this.begin(tutorialSession()); return; }
    this.begin(newSession(previous.mode, previous.level, previous.seed, previous.config, previous.date));
  }

  private go(screen: Screen): void {
    if (this.busy) return;
    this.tick();
    this.store.flush();
    this.screen = screen;
    this.overlay = null;
    this.render();
    window.scrollTo({ top: 0 });
  }

  private pause(): void {
    if (this.screen === 'game' && this.session?.state.status === 'playing' && !this.overlay) this.openOverlay('pause');
  }

  private tick(): void {
    const now = performance.now();
    const delta = Math.max(0, Math.min(now - this.lastTick, 1500));
    this.lastTick = now;
    if (this.screen !== 'game' || this.overlay || !this.session || this.session.state.status !== 'playing' || document.hidden) return;
    this.session.elapsedMs += delta;
    if (this.session.mode !== 'tutorial') this.store.profile.stats.totalPlayMs += delta;
    const timer = this.root.querySelector('[data-timer]');
    if (timer) timer.textContent = formatTime(this.session.elapsedMs);
    if (now - this.lastSave > 1000) { this.lastSave = now; this.store.flush(); }
  }

  private async selectArrow(id: string): Promise<void> {
    const session = this.session;
    if (!session || this.screen !== 'game' || this.overlay || this.busy || !this.renderer) return;
    const result = attemptMove(session.state, id);
    if (result.kind === 'ignored') return;
    this.tick();
    this.busy = true;
    const epoch = this.epoch;
    session.state = result.state;
    if (result.kind === 'removed' && session.mode !== 'tutorial') this.store.profile.stats.arrowsCleared++;
    this.store.flush();
    this.feedback.play(result.kind === 'removed' ? 'tap' : 'blocked', this.store.profile.settings);
    this.updateHud();
    if (result.kind === 'blocked') this.toast('Camino bloqueado. Busca qué flecha sale primero.');
    await this.renderer.animate(result);
    if (epoch !== this.epoch) return;
    this.busy = false;
    this.updateHud();
    if (session.state.status !== 'playing') { this.finish(); return; }
    if (session.mode === 'tutorial') this.highlightTutorial();
    if (document.hidden) this.pause();
  }

  private finish(): void {
    const session = this.session;
    if (!session) return;
    if (!session.recorded) {
      session.recorded = true;
      if (session.mode === 'tutorial') {
        if (session.state.status === 'won') this.store.profile.tutorialDone = true;
      } else if (session.state.status === 'won') {
        const profile = this.store.profile;
        profile.stats.wins++;
        if (!session.state.errors) profile.stats.flawless++;
        if (profile.stats.wins % 3 === 0) profile.hints = Math.min(99, profile.hints + 1);
        if (session.mode === 'classic') profile.level = Math.max(profile.level, session.level + 1);
      }
      this.store.flush();
    }
    if (session.state.status === 'won') this.feedback.play('win', this.store.profile.settings);
    this.openOverlay('result');
  }

  private hint(): void {
    if (this.busy || this.overlay || !this.session || !this.renderer || this.session.state.status !== 'playing') return;
    if (this.store.profile.hints <= 0) { this.openOverlay('hints'); return; }
    const valid = availableMoves(this.session.state.board)[0];
    if (!valid) return;
    this.store.profile.hints--;
    this.store.flush();
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
    document.documentElement.dataset.motion = this.store.profile.settings.reducedMotion ? 'reduced' : 'full';
    this.root.innerHTML = `<div class="app-shell ${this.screen === 'game' ? 'is-playing' : ''}">${this.header()}<main id="main-content">${this.content()}</main>${this.screen !== 'game' ? this.nav() : ''}<div class="overlay-layer"></div><div class="toast" role="status" aria-live="polite"></div></div>`;
    if (this.screen === 'game') void this.mountBoard();
    this.renderOverlay();
  }

  private header(): string {
    const game = this.screen === 'game';
    return `<header class="topbar"><button class="brand" data-action="${game ? 'pause' : 'home'}" aria-label="${game ? 'Pausar partida' : 'Ir al inicio'}"><span class="brand-mark">${icon('arrow')}</span><span>FLECHA<span class="brand-light">TRAMPA</span></span></button><div class="topbar-actions">${game ? `<span class="level-chip">${this.session?.mode === 'tutorial' ? 'PRIMEROS PASOS' : `NIVEL ${String(this.session?.level ?? 1).padStart(2, '0')}`}</span><button class="icon-button" data-action="pause" aria-label="Pausar">${icon('pause')}</button>` : `<span class="edition">UN RETO. TU RITMO.</span><button class="icon-button" data-action="settings" aria-label="Abrir ajustes">${icon('settings')}</button>`}</div></header>`;
  }

  private content(): string {
    switch (this.screen) {
      case 'home': return this.homeContent();
      case 'modes': return this.modesContent();
      case 'stats': return this.statsContent();
      case 'game': return this.gameContent();
    }
  }

  private homeContent(): string {
    const profile = this.store.profile;
    const continuing = profile.classicSave?.state.status === 'playing';
    return `<section class="home-hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> TU PRÓXIMA PEQUEÑA VICTORIA</div><h1>Piensa<br>la <span>salida.</span></h1><p class="hero-description">Cada flecha tiene un camino.<br>El truco es encontrar el orden.</p><button class="primary-button hero-play" data-action="play"><span>${continuing ? 'Continuar partida' : 'Jugar ahora'}<small>CLÁSICO <span>·</span> NIVEL ${String(profile.level).padStart(2, '0')}</small></span>${icon('diagonal')}</button><p class="hero-caption">${icon('heart')} Tres vidas. Cero prisas.</p></div><div class="hero-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-caption">ENCUENTRA TU CAMINO</div>${['up','right','left','down','right','up','down','left','up'].map((direction, index) => `<div class="art-tile art-${index} direction-${direction}"><span>↑</span></div>`).join('')}<div class="art-tag">${icon('spark')} UN MOVIMIENTO LO CAMBIA TODO</div></div></section><section class="home-lower"><div class="section-heading"><span>Más formas de pensar</span><span class="micro-copy">ELIGE TU RETO</span></div><div class="mode-preview-grid"><button class="mode-preview daily-preview" data-action="modes"><span class="preview-icon">${icon('calendar')}</span><span><small>UNO CADA DÍA</small><strong>El reto de hoy</strong><span>Un nuevo día, una nueva salida.</span></span>${icon('diagonal')}</button><button class="mode-preview share-preview" data-action="modes"><span class="preview-icon">${icon('share')}</span><span><small>MEJOR EN COMPAÑÍA</small><strong>Reta a alguien</strong><span>El mismo puzle. ¿Otro camino?</span></span>${icon('diagonal')}</button></div><div class="home-footnote"><span class="tiny-dots"><i></i><i></i><i></i><i></i></span> Sin cuenta. Sin prisa. Con ingenio.</div></section>`;
  }

  private modesContent(): string {
    return `<section class="page-section"><div class="eyebrow">CADA MENTE TIENE SU CAMINO</div><h1 class="page-title">A tu manera.</h1><p class="page-description">Elige cómo quieres poner a prueba tu ingenio.</p><div class="mode-list"><button class="mode-card" data-action="play"><span class="mode-number">01</span><div>${icon('grid')}<h2>Un poco más lejos.</h2><p>Niveles infinitos, dificultad progresiva y tres vidas para encontrar la salida.</p><span class="mode-label">CLÁSICO ${icon('arrow')}</span></div></button><div class="mode-card upcoming"><span class="mode-number">02</span><div>${icon('calendar')}<h2>Una cita con tu ingenio.</h2><p>El desafío diario se incorporará en la siguiente integración.</p><span class="mode-label">DESAFÍO DIARIO</span></div></div><div class="mode-card upcoming"><span class="mode-number">03</span><div>${icon('share')}<h2>Comparte el desafío.</h2><p>Los retos reproducibles se incorporarán en la siguiente integración.</p><span class="mode-label">RETOS COMPARTIDOS</span></div></div></div></section>`;
  }

  private statsContent(): string {
    const { stats, level, hints } = this.store.profile;
    return `<section class="page-section"><div class="eyebrow">CADA MOVIMIENTO CUENTA</div><h1 class="page-title">Tu camino.</h1><p class="page-description">Las pequeñas victorias también merecen su espacio.</p><div class="progress-hero">${icon('trophy')}<span>NIVEL ACTUAL</span><strong>${String(level).padStart(2, '0')}</strong><p>${level - 1} niveles clásicos superados</p></div><div class="stat-grid">${[[stats.played,'Partidas jugadas','grid'],[stats.wins,'Victorias','trophy'],[stats.flawless,'Sin errores','shield'],[formatTime(stats.totalPlayMs),'Tiempo de juego','clock'],[stats.arrowsCleared,'Flechas liberadas','arrow'],[hints,'Pistas disponibles','spark']].map(([value,label,glyph]) => `<div class="stat-card">${icon(String(glyph))}<strong>${value}</strong><span>${label}</span></div>`).join('')}</div><div class="info-note">${icon('shield')} Tu progreso vive en este dispositivo. No necesitas registrarte.</div></section>`;
  }

  private gameContent(): string {
    const session = this.session!;
    const tutorial = session.mode === 'tutorial';
    return `<section class="game-layout"><div class="game-intro"><div class="eyebrow">${tutorial ? 'APRENDER HACIENDO' : session.mode === 'classic' ? 'MODO CLÁSICO' : session.mode === 'daily' ? 'DESAFÍO DIARIO' : 'RETO COMPARTIDO'}</div><h1 class="game-title">${tutorial ? 'Todo tiene<br> un orden.' : 'Una flecha.<br> Un paso más.'}</h1><p class="game-description">Observa el tablero. Libera los caminos.<br>La siguiente salida está ahí.</p><div class="desktop-tip">${icon('help')}<p>Una flecha solo puede salir si no hay otra en su trayectoria. Cada intento bloqueado cuesta una vida.</p></div></div><div class="play-area"><div class="game-hud"><div class="lives" aria-label="3 vidas" data-lives></div><span class="game-timer">${icon('clock')}<span data-timer>${formatTime(session.elapsedMs)}</span></span></div><div class="board-frame"><div class="board-corner corner-tl"></div><div class="board-corner corner-br"></div><div class="board-host" aria-hidden="true"></div><div class="board-controls" role="group" aria-label="Tablero de flechas"></div><div class="board-loading">Preparando tu camino…</div></div><div class="board-progress"><span>FLECHAS LIBERADAS</span><strong data-counter></strong><div class="progress-track"><i data-progress></i></div></div><div class="tutorial-instruction" ${tutorial ? '' : 'hidden'}></div><div class="game-tools"><button class="hint-button" data-action="hint">${icon('spark')}<span>Una pista</span><span class="hint-count" data-hints>${this.store.profile.hints}</span></button><button class="text-button" data-action="pause">Tomar un respiro ${icon('pause')}</button></div><p class="board-caption">${icon('arrow')} Toca una flecha para liberarla.</p></div></section>`;
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
      this.renderer = new BoardRenderer(host, session.state.board, { ...this.store.profile.settings, reducedMotion: this.store.profile.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches }, (id) => { void this.selectArrow(id); });
      await this.renderer.ready;
      if (epoch !== this.epoch) return;
      this.busy = false;
      this.root.querySelector('.board-loading')?.remove();
      this.updateHud();
      if (session.mode === 'tutorial') this.highlightTutorial();
    } catch {
      this.busy = false;
      const loading = this.root.querySelector('.board-loading');
      if (loading) loading.innerHTML = 'No se pudo iniciar el tablero. <button class="text-button" data-action="restart">Volver a intentar</button>';
    }
  }

  private updateHud(): void {
    const session = this.session;
    if (!session) return;
    const lives = this.root.querySelector('[data-lives]');
    if (lives) { lives.innerHTML = [0, 1, 2].map((index) => `<span class="${index < session.state.lives ? 'heart-full' : 'heart-empty'}">${icon('heart')}</span>`).join(''); lives.setAttribute('aria-label', `${session.state.lives} vidas`); }
    const count = this.root.querySelector('[data-counter]');
    const removed = session.state.totalArrows - session.state.board.arrows.length;
    if (count) count.textContent = `${removed} / ${session.state.totalArrows}`;
    const progress = this.root.querySelector<HTMLElement>('[data-progress]');
    if (progress) progress.style.width = `${removed / session.state.totalArrows * 100}%`;
    const hints = this.root.querySelector('[data-hints]');
    if (hints) hints.textContent = String(this.store.profile.hints);
    const controls = this.root.querySelector('.board-controls');
    if (controls) {
      const board = session.state.board;
      const cell = 664 / Math.max(board.width, board.height);
      controls.innerHTML = board.arrows.map((arrow) => `<button class="board-cell" data-arrow="${escapeHtml(arrow.id)}" data-x="${arrow.x}" data-y="${arrow.y}" data-direction="${arrow.direction}" aria-label="Flecha ${DIRECTION_LABEL[arrow.direction]}, fila ${arrow.y + 1}, columna ${arrow.x + 1}" style="left:${((720 - board.width * cell) / 2 + arrow.x * cell) / 720 * 100}%;top:${((720 - board.height * cell) / 2 + arrow.y * cell) / 720 * 100}%;width:${cell / 720 * 100}%;height:${cell / 720 * 100}%" ${this.busy || this.overlay ? 'disabled' : ''}></button>`).join('');
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="pause"], [data-action="hint"]').forEach((button) => { button.disabled = this.busy; });
  }

  private highlightTutorial(): void {
    const session = this.session;
    if (!session || session.mode !== 'tutorial') return;
    const remaining = session.state.board.arrows.length;
    const messages = ['','¡Última flecha! El camino ya está libre.','Bien. Al salir, ha liberado el camino de otra.','Empieza por la flecha de la derecha. Tiene la salida libre.'];
    const instruction = this.root.querySelector('.tutorial-instruction');
    if (instruction) instruction.innerHTML = `<span>0${4 - remaining} / 03</span><p>${messages[remaining]}</p>`;
    const valid = availableMoves(session.state.board)[0];
    if (valid) this.renderer?.hint(valid.id);
  }

  private nav(): string {
    return `<nav class="bottom-nav" aria-label="Navegación principal">${[['home','home','Inicio'],['modes','grid','Modos'],['stats','chart','Tu progreso']].map(([screen,glyph,label]) => `<button data-action="${screen}" class="nav-item ${this.screen === screen ? 'active' : ''}" ${this.screen === screen ? 'aria-current="page"' : ''}>${icon(glyph!)}<span>${label}</span></button>`).join('')}<span class="nav-signature">FLECHA TRAMPA <small>v0.1</small></span></nav>`;
  }

  private openOverlay(overlay: Overlay): void {
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
    const main = this.root.querySelector<HTMLElement>('main');
    if (main) main.inert = this.overlay !== null;
    if (!this.overlay) { layer.innerHTML = ''; return; }
    let content = '';
    const close = `<button class="icon-button modal-close" data-action="close-overlay" aria-label="Cerrar">${icon('close')}</button>`;
    if (this.overlay === 'onboarding') content = `<div class="modal-symbol lime">${icon('arrow')}</div><div class="eyebrow">BIENVENIDO A FLECHA TRAMPA</div><h2>Todo empieza<br>con una flecha.</h2><p>Libera las flechas en el orden correcto. Tres vidas, un tablero y tu ingenio.</p><button class="primary-button" data-action="tutorial">Aprender jugando ${icon('arrow')}</button><button class="text-button centered" data-action="skip-tutorial">Ya sé jugar</button>`;
    if (this.overlay === 'pause') content = `<div class="modal-symbol lavender">${icon('pause')}</div><div class="eyebrow">SIN PRISA</div><h2>Un pequeño<br>respiro.</h2><p>Tu tablero te espera justo donde lo dejaste.</p><button class="primary-button" data-action="resume">Continuar ${icon('play')}</button><button class="secondary-button" data-action="restart">Reiniciar nivel ${icon('retry')}</button><div class="modal-links"><button class="text-button" data-action="settings">Ajustes</button><button class="text-button" data-action="home">Volver al inicio</button></div>`;
    if (this.overlay === 'settings') {
      const settings = this.store.profile.settings;
      content = `${close}<div class="eyebrow">A TU GUSTO</div><h2>Tu espacio.</h2><p>Pequeños detalles para pensar mejor.</p><div class="settings-list">${[['sound','Sonido','Tonos suaves en cada movimiento'],['haptics','Vibración','Una respuesta que se siente'],['reducedMotion','Reducir movimiento','Animaciones más discretas']].map(([key,label,description]) => `<button class="setting-row" data-action="toggle" data-value="${key}" role="switch" aria-checked="${settings[key as 'sound' | 'haptics' | 'reducedMotion']}"><span><strong>${label}</strong><small>${description}</small></span><span class="switch ${settings[key as 'sound' | 'haptics' | 'reducedMotion'] ? 'on' : ''}"></span></button>`).join('')}</div><div class="theme-heading">PALETA DE FLECHAS</div><div class="theme-options">${[['aurora','Aurora'],['ember','Atardecer']].map(([name,label]) => `<button data-action="theme" data-value="${name}" class="theme-option ${settings.theme === name ? 'selected' : ''}" aria-pressed="${settings.theme === name}"><span class="theme-swatches ${name}"><i></i><i></i><i></i><i></i></span>${label}${settings.theme === name ? icon('check') : ''}</button>`).join('')}</div><button class="text-button centered" data-action="tutorial">${icon('help')} Repetir tutorial</button><p class="settings-footer">FLECHA TRAMPA · v0.1.0<br>Tu progreso se queda en este dispositivo.</p>`;
    }
    if (this.overlay === 'hints') content = `${close}<div class="modal-symbol lavender">${icon('spark')}</div><h2>Tu ingenio<br>también recarga.</h2><p>No te quedan pistas. Cada tres victorias conseguirás una nueva. Los anuncios recompensados todavía no están disponibles.</p><button class="primary-button" data-action="close-overlay">Seguir pensando ${icon('arrow')}</button>`;
    if (this.overlay === 'result') content = this.resultContent();
    layer.innerHTML = `<div class="modal-backdrop"><section class="modal-card ${this.overlay === 'result' ? 'result-card' : ''}" role="dialog" aria-modal="true" aria-label="${this.overlay === 'settings' ? 'Ajustes' : this.overlay === 'result' ? 'Resultado de la partida' : this.overlay === 'pause' ? 'Partida en pausa' : 'FLECHA TRAMPA'}">${content}</section></div>`;
    window.requestAnimationFrame(() => layer.querySelector<HTMLElement>('button')?.focus());
  }

  private resultContent(): string {
    const session = this.session!;
    const won = session.state.status === 'won';
    const tutorial = session.mode === 'tutorial';
    return `<div class="result-burst ${won ? '' : 'defeat'}">${icon(won ? 'spark' : 'retry')}</div><div class="eyebrow">${won ? tutorial ? 'YA TIENES LA CLAVE' : 'CAMINO DESPEJADO' : 'TÓMATE OTRO INTENTO'}</div><h2>${won ? tutorial ? 'Ahora, a<br>tu manera.' : session.state.errors === 0 ? 'Así de<br>impecable.' : 'Una pequeña<br>gran victoria.' : 'La salida<br>sigue ahí.'}</h2><p>${won ? tutorial ? 'Busca caminos libres. Cada flecha que sale abre nuevas posibilidades.' : session.state.errors === 0 ? 'Ni un solo error. A veces, todo encaja.' : 'Has encontrado el orden. Disfruta ese momento.' : 'Tres vidas después, ya conoces mejor el tablero. ¿Lo vuelves a intentar?'}</p><div class="result-stats"><div><strong>${formatTime(session.elapsedMs)}</strong><span>TIEMPO</span></div><div><strong>${session.state.errors}</strong><span>ERRORES</span></div><div><strong>${session.state.totalArrows - session.state.board.arrows.length}</strong><span>FLECHAS</span></div></div>${won && !tutorial && this.store.profile.stats.wins % 3 === 0 ? '<div class="reward-note">+1 pista · Cada victoria abre caminos.</div>' : ''}<button class="primary-button" data-action="${won ? 'next' : 'restart'}">${won ? tutorial ? 'Empezar mi aventura' : 'Siguiente nivel' : 'Volver a intentarlo'} ${icon(won ? 'arrow' : 'retry')}</button><button class="text-button centered" data-action="home">Volver al inicio</button>`;
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.overlay === 'settings' || this.overlay === 'hints') this.closeOverlay();
      else if (this.overlay === 'pause') this.closeOverlay();
      else this.pause();
    }
    if (event.key !== 'Tab' || !this.overlay) return;
    const buttons = [...this.root.querySelectorAll<HTMLElement>('.modal-card button:not([disabled])')];
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
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
