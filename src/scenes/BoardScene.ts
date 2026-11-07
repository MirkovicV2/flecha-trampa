import Phaser from 'phaser';
import { ARROW_COLORS } from '../config/theme';
import type { PlayerSettings } from '../config/theme';
import { VECTORS } from '../core/types';
import type { Arrow, Board, MoveResult } from '../core/types';
import { ARROW_DESIGNS, MATERIAL_INKS } from '../config/arrow-designs';

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
    tile.fillStyle(0x090f18, 0.4);
    tile.fillRoundedRect(-size / 2, -size / 2 + 3, size, size, this.cell * 0.13);
    tile.fillStyle(0x26303d, 0.89);
    tile.fillRoundedRect(-size / 2, -size / 2, size, size, this.cell * 0.17);
    tile.lineStyle(1.2, 0xa2b2c9, 0.17);
    tile.strokeRoundedRect(-size / 2, -size / 2, size, size, this.cell * 0.17);
    const glyph = this.add.graphics();
    const color = ARROW_COLORS[this.settings.theme][arrow.direction];
    const inks = { body: color, ...MATERIAL_INKS };
    const scale = this.cell * 0.0072;
    for (const layer of ARROW_DESIGNS[this.settings.skin].layers) {
      glyph.beginPath();
      layer.points.forEach(([px, py], index) => {
        const xx = (px - 50) * scale;
        const yy = (py - 50) * scale;
        if (index) glyph.lineTo(xx, yy);
        else glyph.moveTo(xx, yy);
      });
      if (layer.fill) {
        glyph.closePath();
        glyph.fillStyle(inks[layer.fill], layer.opacity ?? 1);
        glyph.fillPath();
      } else {
        glyph.lineStyle((layer.width ?? 1) * scale, inks[layer.stroke!], layer.opacity ?? 1);
        glyph.strokePath();
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
        const style = ARROW_DESIGNS[this.settings.skin].exit;
        const particles = 6 + Math.min(16, combo * 2);
        const color = ARROW_COLORS[this.settings.theme][arrow.direction];
        this.cosmeticExit(view, dx, dy, color);
        const ring = this.add
          .circle(view.x, view.y, this.cell * 0.22)
          .setStrokeStyle(combo >= 4 ? 4 : 2, color, 0.8);
        this.tweens.add({
          targets: ring,
          scale: combo >= 7 ? 3.8 : 2.8,
          alpha: 0,
          duration: 260,
          onComplete: () => ring.destroy(),
        });
        if (combo >= 2) {
          const trail = this.add
            .rectangle(view.x, view.y, this.cell * 0.7, this.cell * 0.1, color, 0.45)
            .setRotation(Math.atan2(dy, dx))
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: trail,
            x: view.x + dx * SIDE,
            y: view.y + dy * SIDE,
            scaleX: 3 + Math.min(combo, 10) * 0.15,
            alpha: 0,
            duration: 200,
            ease: 'Quad.In',
            onComplete: () => trail.destroy(),
          });
        }
        for (let index = 0; index < particles; index++) {
          const spark =
            style === 'pixel'
              ? this.add.rectangle(view.x, view.y, 5 + (index % 3), 5 + (index % 3), color, 0.8)
              : style === 'prism' || style === 'crown'
                ? this.add.triangle(
                    view.x,
                    view.y,
                    0,
                    -6,
                    4,
                    3,
                    -4,
                    3,
                    style === 'crown' ? 0xffd58b : color,
                    0.9,
                  )
                : this.add.circle(view.x, view.y, 2 + (index % 3), color, 0.75);
          this.tweens.add({
            targets: spark,
            x:
              view.x + Math.cos((index * Math.PI * 2) / particles) * (38 + Math.min(combo, 12) * 7),
            y:
              view.y + Math.sin((index * Math.PI * 2) / particles) * (38 + Math.min(combo, 12) * 7),
            alpha: 0,
            scale: 0.2,
            angle: style === 'pixel' ? 0 : index * 57,
            duration: 350,
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

  private cosmeticExit(
    view: Phaser.GameObjects.Container,
    dx: number,
    dy: number,
    color: number,
  ): void {
    const style = ARROW_DESIGNS[this.settings.skin].exit;
    const angle = Math.atan2(dy, dx);
    const fade = (
      object: Phaser.GameObjects.Shape | Phaser.GameObjects.Graphics,
      duration: number,
      values: Record<string, number>,
    ) => {
      this.tweens.add({
        targets: object,
        ...values,
        alpha: 0,
        duration,
        ease: 'Cubic.Out',
        onComplete: () => object.destroy(),
      });
    };
    if (style === 'orbit' || style === 'crown') {
      for (let i = 0; i < 2; i++) {
        const halo = this.add
          .circle(view.x, view.y, this.cell * (0.25 + i * 0.12))
          .setStrokeStyle(style === 'crown' ? 3 : 2, style === 'crown' ? 0xffd58b : color, 0.75)
          .setScale(1, style === 'orbit' ? 0.48 : 1)
          .setRotation(angle + (i * Math.PI) / 2);
        fade(halo, 430, { scaleX: 2.5, scaleY: 2.5, angle: halo.angle + 70 });
      }
    } else if (style === 'electric') {
      const arc = this.add.graphics().setPosition(view.x, view.y).setRotation(angle);
      arc.lineStyle(2.5, 0xffd58b, 0.9);
      arc.beginPath();
      arc.moveTo(-this.cell * 0.3, 0);
      for (let i = 0; i < 7; i++)
        arc.lineTo(i * this.cell * 0.12, (i % 2 ? -1 : 1) * this.cell * 0.13);
      arc.strokePath();
      fade(arc, 240, { scaleX: 2.3 });
    } else {
      const count = style === 'nova' ? 3 : style === 'echo' ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * this.cell * 0.18;
        const streak = this.add
          .rectangle(
            view.x - dy * offset,
            view.y + dx * offset,
            this.cell * (style === 'nova' ? 0.65 : 0.4),
            style === 'pixel' ? 6 : 3,
            i === 1 ? 0xffffff : color,
            0.7,
          )
          .setRotation(angle);
        fade(streak, style === 'pixel' ? 170 : 320, {
          x: streak.x + dx * this.cell * 1.8,
          y: streak.y + dy * this.cell * 1.8,
          scaleX: 2.7,
        });
      }
    }
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
  private booted = false;
  private paused = false;
  private destroyed = false;

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
    void this.ready.then(() => {
      this.booted = true;
      if (!this.destroyed) this.setPaused(this.paused);
    });
  }

  /** Static overlays do not need a WebGL frame loop behind their backdrop blur. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!this.booted || this.destroyed) return;
    if (paused) this.game.loop.sleep();
    else this.game.loop.wake();
  }

  animate(result: MoveResult, combo = 0): Promise<void> {
    return this.boardScene.animate(result, combo);
  }
  hint(id: string): void {
    this.boardScene.hint(id);
  }
  destroy(): void {
    this.destroyed = true;
    this.game.destroy(true);
    // Phaser processes pendingDestroy on a frame; a sleeping game still needs that frame.
    if (this.booted && !this.game.loop.running) this.game.loop.wake();
  }
}
