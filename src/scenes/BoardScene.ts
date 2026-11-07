import Phaser from 'phaser';
import { ARROW_COLORS } from '../config/theme';
import type { PlayerSettings } from '../config/theme';
import { VECTORS } from '../core/types';
import type { Arrow, Board, MoveResult } from '../core/types';
import { SKINS } from '../config/collection';

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

  constructor(board: Board, settings: PlayerSettings, ready: () => void) {
    super({ key: 'Board' });
    this.initialBoard = board;
    this.settings = settings;
    this.readyCallback = ready;
  }

  create(): void {
    const board = this.initialBoard;
    this.cell = (SIDE - MARGIN * 2) / Math.max(board.width, board.height);
    const grid = this.add.graphics();
    for (let y = 0; y < board.height; y++)
      for (let x = 0; x < board.width; x++) {
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
    return [
      (SIDE - board.width * this.cell) / 2 + (x + 0.5) * this.cell,
      (SIDE - board.height * this.cell) / 2 + (y + 0.5) * this.cell,
    ];
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
    [
      [0, arm],
      [0, -arm],
      [-arm * 0.78, -arm * 0.22],
      [arm * 0.78, -arm * 0.22],
    ].forEach(([xx, yy]) => glyph.fillCircle(xx!, yy!, thickness / 2));
    const shape = SKINS.find((skin) => skin.id === this.settings.skin)!.shape;
    glyph.lineStyle(thickness * 0.52, color, 0.95);
    const line = (points: readonly (readonly [number, number])[]) => {
      glyph.beginPath();
      points.forEach(([px, py], index) =>
        index ? glyph.lineTo(px * arm, py * arm) : glyph.moveTo(px * arm, py * arm),
      );
      glyph.strokePath();
    };
    if (shape === 'double')
      line([
        [-0.78, 0.5],
        [0, -0.2],
        [0.78, 0.5],
      ]);
    if (shape === 'bolt')
      line([
        [-0.8, 0.9],
        [-0.3, 0.05],
        [-0.5, 0.7],
        [0.35, 0.4],
      ]);
    if (shape === 'pixel') {
      glyph.fillRect(-thickness, arm - thickness / 2, thickness * 2, thickness);
      line([
        [-0.9, -0.1],
        [-0.9, -0.65],
        [-0.45, -0.65],
      ]);
      line([
        [0.9, -0.1],
        [0.9, -0.65],
        [0.45, -0.65],
      ]);
    }
    if (shape === 'diamond')
      line([
        [0, -0.2],
        [0.55, 0.35],
        [0, 0.9],
        [-0.55, 0.35],
        [0, -0.2],
      ]);
    if (shape === 'orbit') glyph.strokeCircle(0, arm * 0.15, arm * 0.68);
    if (shape === 'royal') {
      line([
        [-0.85, -0.2],
        [-1.05, -0.85],
        [-0.5, -0.55],
      ]);
      line([
        [0.85, -0.2],
        [1.05, -0.85],
        [0.5, -0.55],
      ]);
      line([
        [-0.45, 1.15],
        [0.45, 1.15],
      ]);
    }
    if (shape === 'nova') {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        line([
          [Math.cos(angle) * 0.8, Math.sin(angle) * 0.8],
          [Math.cos(angle) * 1.12, Math.sin(angle) * 1.12],
        ]);
      }
    }
    glyph.rotation = ROTATION[arrow.direction];
    const container = this.add.container(x, y, [tile, glyph]);
    container.setSize(size, size);
    this.views.set(arrow.id, container);
    if (!this.settings.reducedMotion) {
      container.setAlpha(0).setScale(0.85);
      this.tweens.add({
        targets: container,
        alpha: 1,
        scale: 1,
        duration: 300,
        delay: (arrow.x + arrow.y) * 15,
        ease: 'Cubic.Out',
      });
    }
  }

  animate(result: MoveResult, combo = 0): Promise<void> {
    const arrow = result.arrow;
    const view = arrow ? this.views.get(arrow.id) : undefined;
    if (!view || !arrow) return Promise.resolve();
    this.tweens.killTweensOf(view);
    view.setAlpha(1).setScale(1);
    return new Promise((resolve) => {
      const done = () => {
        this.pending.delete(done);
        resolve();
      };
      this.pending.add(done);
      if (result.kind === 'blocked') {
        const [dx, dy] = VECTORS[arrow.direction];
        this.tweens.add({
          targets: view,
          x: view.x + dx * this.cell * 0.1,
          y: view.y + dy * this.cell * 0.1,
          duration: this.settings.reducedMotion ? 25 : 45,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.InOut',
          onComplete: done,
        });
        return;
      }
      const [dx, dy] = VECTORS[arrow.direction];
      if (!this.settings.reducedMotion) {
        const particles = 6 + Math.min(10, combo * 2);
        const color = ARROW_COLORS[this.settings.theme][arrow.direction];
        const ring = this.add
          .circle(view.x, view.y, this.cell * 0.22)
          .setStrokeStyle(2, color, 0.6);
        this.tweens.add({
          targets: ring,
          scale: 2.1,
          alpha: 0,
          duration: 200,
          onComplete: () => ring.destroy(),
        });
        for (let index = 0; index < particles; index++) {
          const spark = this.add.circle(view.x, view.y, 2 + (index % 3), color, 0.75);
          this.tweens.add({
            targets: spark,
            x: view.x + Math.cos((index * Math.PI * 2) / particles) * (30 + Math.min(combo, 8) * 4),
            y: view.y + Math.sin((index * Math.PI * 2) / particles) * (30 + Math.min(combo, 8) * 4),
            alpha: 0,
            scale: 0.2,
            duration: 260,
            onComplete: () => spark.destroy(),
          });
        }
      }
      this.tweens.add({
        targets: view,
        x: view.x + dx * (SIDE + this.cell),
        y: view.y + dy * (SIDE + this.cell),
        alpha: 0,
        duration: this.settings.reducedMotion ? 40 : Math.max(150, 240 - combo * 12),
        ease: 'Quad.In',
        onComplete: () => {
          this.views.delete(arrow.id);
          view.destroy();
          done();
        },
      });
    });
  }

  hint(id: string): void {
    const view = this.views.get(id);
    if (!view) return;
    this.tweens.killTweensOf(view);
    view.setAlpha(1).setScale(1);
    if (this.settings.reducedMotion) return;
    this.tweens.add({
      targets: view,
      scale: this.settings.reducedMotion ? 1 : 1.12,
      alpha: 0.5,
      duration: 450,
      yoyo: true,
      repeat: 2,
    });
  }
}

export class BoardRenderer {
  readonly ready: Promise<void>;
  private readonly game: Phaser.Game;
  private readonly boardScene: BoardScene;

  constructor(host: HTMLElement, board: Board, settings: PlayerSettings) {
    let onReady: () => void = () => undefined;
    this.ready = new Promise<void>((resolve) => {
      onReady = resolve;
    });
    this.boardScene = new BoardScene(board, settings, onReady);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: SIDE,
      height: SIDE,
      transparent: true,
      scene: [this.boardScene],
      audio: { noAudio: true },
      input: { mouse: false, touch: false, keyboard: false, gamepad: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, powerPreference: 'low-power' },
      banner: false,
    });
  }

  animate(result: MoveResult, combo = 0): Promise<void> {
    return this.boardScene.animate(result, combo);
  }
  hint(id: string): void {
    this.boardScene.hint(id);
  }
  destroy(): void {
    this.game.destroy(true);
  }
}
