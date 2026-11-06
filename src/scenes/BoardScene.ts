import Phaser from 'phaser';
import { ARROW_COLORS } from '../config/theme';
import type { PlayerSettings } from '../config/theme';
import { VECTORS } from '../core/types';
import type { Arrow, Board, MoveResult } from '../core/types';

const SIDE = 720;
const MARGIN = 28;
const ROTATION = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };

class BoardScene extends Phaser.Scene {
  private readonly views = new Map<string, Phaser.GameObjects.Container>();
  private readonly pending = new Set<() => void>();
  private cell = 100;
  private settings: PlayerSettings;
  private readonly initialBoard: Board;
  private readonly readyCallback: () => void;
  private readonly select: (id: string) => void;

  constructor(board: Board, settings: PlayerSettings, select: (id: string) => void, ready: () => void) {
    super({ key: 'Board' });
    this.initialBoard = board;
    this.settings = settings;
    this.select = select;
    this.readyCallback = ready;
  }

  create(): void {
    const board = this.initialBoard;
    this.cell = (SIDE - MARGIN * 2) / Math.max(board.width, board.height);
    const grid = this.add.graphics();
    for (let y = 0; y < board.height; y++) for (let x = 0; x < board.width; x++) {
      const [cx, cy] = this.position(x, y, board);
      grid.fillStyle(0x9aa3b8, 0.17);
      grid.fillCircle(cx, cy, 2.3);
    }
    board.arrows.forEach((arrow) => this.addArrow(arrow, board));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pending.forEach((resolve) => resolve());
      this.pending.clear();
    });
    this.readyCallback();
  }

  private position(x: number, y: number, board: Board): readonly [number, number] {
    return [(SIDE - board.width * this.cell) / 2 + (x + 0.5) * this.cell, (SIDE - board.height * this.cell) / 2 + (y + 0.5) * this.cell];
  }

  private addArrow(arrow: Arrow, board: Board): void {
    const [x, y] = this.position(arrow.x, arrow.y, board);
    const tile = this.add.graphics();
    const size = this.cell * 0.88;
    tile.fillStyle(0x222631, 0.83);
    tile.fillRoundedRect(-size / 2, -size / 2, size, size, this.cell * 0.17);
    tile.lineStyle(1, 0x647086, 0.1);
    tile.strokeRoundedRect(-size / 2, -size / 2, size, size, this.cell * 0.17);
    const glyph = this.add.graphics();
    const color = ARROW_COLORS[this.settings.theme][arrow.direction];
    const thickness = this.cell * 0.083;
    const arm = this.cell * 0.21;
    glyph.lineStyle(thickness, color, 1);
    glyph.beginPath();
    glyph.moveTo(0, arm);
    glyph.lineTo(0, -arm);
    glyph.moveTo(-arm * 0.78, -arm * 0.22);
    glyph.lineTo(0, -arm);
    glyph.lineTo(arm * 0.78, -arm * 0.22);
    glyph.strokePath();
    glyph.fillStyle(color);
    [[0, arm], [0, -arm], [-arm * 0.78, -arm * 0.22], [arm * 0.78, -arm * 0.22]].forEach(([xx, yy]) => glyph.fillCircle(xx!, yy!, thickness / 2));
    glyph.rotation = ROTATION[arrow.direction];
    const container = this.add.container(x, y, [tile, glyph]);
    container.setSize(size, size);
    container.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => this.select(arrow.id));
    this.views.set(arrow.id, container);
    if (!this.settings.reducedMotion) {
      container.setAlpha(0).setScale(0.85);
      this.tweens.add({ targets: container, alpha: 1, scale: 1, duration: 300, delay: (arrow.x + arrow.y) * 15, ease: 'Cubic.Out' });
    }
  }

  animate(result: MoveResult): Promise<void> {
    const arrow = result.arrow;
    const view = arrow ? this.views.get(arrow.id) : undefined;
    if (!view || !arrow) return Promise.resolve();
    this.tweens.killTweensOf(view);
    return new Promise((resolve) => {
      const done = () => { this.pending.delete(done); resolve(); };
      this.pending.add(done);
      if (result.kind === 'blocked') {
        const [dx, dy] = VECTORS[arrow.direction];
        this.tweens.add({ targets: view, x: view.x + dx * this.cell * 0.1, y: view.y + dy * this.cell * 0.1, duration: this.settings.reducedMotion ? 30 : 65, yoyo: true, repeat: 1, ease: 'Sine.InOut', onComplete: done });
        return;
      }
      const [dx, dy] = VECTORS[arrow.direction];
      if (!this.settings.reducedMotion) {
        for (let index = 0; index < 6; index++) {
          const spark = this.add.circle(view.x, view.y, 2 + index % 3, ARROW_COLORS[this.settings.theme][arrow.direction], 0.75);
          this.tweens.add({ targets: spark, x: view.x + Math.cos(index * Math.PI / 3) * 35, y: view.y + Math.sin(index * Math.PI / 3) * 35, alpha: 0, scale: 0.2, duration: 400, onComplete: () => spark.destroy() });
        }
      }
      this.tweens.add({
        targets: view, x: view.x + dx * (SIDE + this.cell), y: view.y + dy * (SIDE + this.cell), alpha: 0,
        duration: this.settings.reducedMotion ? 50 : 340, ease: 'Cubic.In',
        onComplete: () => { this.views.delete(arrow.id); view.destroy(); done(); },
      });
    });
  }

  hint(id: string): void {
    const view = this.views.get(id);
    if (!view) return;
    this.tweens.killTweensOf(view);
    view.setAlpha(1).setScale(1);
    this.tweens.add({ targets: view, scale: this.settings.reducedMotion ? 1 : 1.12, alpha: 0.5, duration: 450, yoyo: true, repeat: 2 });
  }
}

export class BoardRenderer {
  readonly ready: Promise<void>;
  private readonly game: Phaser.Game;
  private readonly boardScene: BoardScene;

  constructor(host: HTMLElement, board: Board, settings: PlayerSettings, onSelect: (id: string) => void) {
    let onReady: () => void = () => undefined;
    this.ready = new Promise<void>((resolve) => { onReady = resolve; });
    this.boardScene = new BoardScene(board, settings, onSelect, onReady);
    this.game = new Phaser.Game({
      type: Phaser.AUTO, parent: host, width: SIDE, height: SIDE, transparent: true,
      scene: [this.boardScene], audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, powerPreference: 'low-power' },
      banner: false,
    });
  }

  animate(result: MoveResult): Promise<void> { return this.boardScene.animate(result); }
  hint(id: string): void { this.boardScene.hint(id); }
  destroy(): void { this.game.destroy(true); }
}
