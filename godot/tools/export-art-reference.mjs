import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});
const { ARROW_DESIGNS, MATERIAL_INKS } = await import('../../src/config/arrow-designs.ts');
const { ARROW_COLORS } = await import('../../src/config/theme.ts');
const { SKINS } = await import('../../src/config/collection.ts');
const source = readFileSync(new URL('../../src/scenes/BoardScene.ts', import.meta.url), 'utf8');
const method = source.slice(source.indexOf('  private cosmeticExit('), source.indexOf('\n  hint('));
if (!method.includes("style === 'petal'") || !method.endsWith('  }\n')) {
  throw new Error('Original method boundary changed; review the extractor.');
}
// Execute the actual unchanged method with a recording shape/tween adapter.
// This deliberately does not reimplement its conditions or animation formulas.
const compiled = ts.transpileModule(`class Reference {${method}}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const Reference = new Function('ARROW_DESIGNS', compiled + '\nreturn Reference;')(ARROW_DESIGNS);
const cases = [];
for (const skin of SKINS) {
  for (const [direction, [dx, dy]] of Object.entries({
    up: [0, -1],
    right: [1, 0],
    down: [0, 1],
    left: [-1, 0],
  })) {
    const shapes = [];
    const shape = (kind, x = 0, y = 0, width = 0, height = 0, color = 0, alpha = 1) => {
      const result = {
        kind,
        x,
        y,
        width,
        height,
        color,
        alpha,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        strokeWidth: 0,
        points: [],
        get angle() {
          return (this.rotation * 180) / Math.PI;
        },
        setRotation(value) {
          this.rotation = value;
          return this;
        },
        setPosition(xx, yy) {
          this.x = xx;
          this.y = yy;
          return this;
        },
        setScale(xx, yy = xx) {
          this.scaleX = xx;
          this.scaleY = yy;
          return this;
        },
        setStrokeStyle(w, c, a) {
          this.strokeWidth = w;
          this.color = c;
          this.alpha = a;
          return this;
        },
        lineStyle(w, c, a) {
          return this.setStrokeStyle(w, c, a);
        },
        beginPath() {},
        strokePath() {},
        moveTo(xx, yy) {
          this.points.push([xx, yy]);
        },
        lineTo(xx, yy) {
          this.points.push([xx, yy]);
        },
      };
      shapes.push(result);
      return result;
    };
    const reference = new Reference();
    reference.settings = { skin: skin.id };
    reference.cell = 64;
    reference.add = {
      ellipse: (...args) => shape('ellipse', ...args),
      rectangle: (...args) => shape('rectangle', ...args),
      graphics: () => shape('graphics'),
      circle: (x, y, radius) => shape('circle', x, y, radius * 2, radius * 2),
      triangle: (x, y, x1, y1, x2, y2, x3, y3, color, alpha) => {
        const value = shape('triangle', x, y, 0, 0, color, alpha);
        value.points = [
          [x1, y1],
          [x2, y2],
          [x3, y3],
        ];
        return value;
      },
    };
    reference.tweens = {
      add({ targets, duration, alpha, ease, onComplete, ...target }) {
        if (alpha !== 0 || ease !== 'Cubic.Out' || typeof onComplete !== 'function') {
          throw new Error('Original tween contract changed.');
        }
        targets.duration = duration;
        targets.target = target;
      },
    };
    reference.cosmeticExit({ x: 0, y: 0 }, dx, dy, ARROW_COLORS.aurora[direction]);
    const normalized = shapes.map((value) => {
      const copy = JSON.parse(JSON.stringify(value));
      delete copy.angle;
      return copy;
    });
    cases.push({ skin: skin.id, direction, shapes: normalized });
  }
}
const output = {
  source: 'src/scenes/BoardScene.ts:cosmeticExit',
  sha256: createHash('sha256').update(source).digest('hex'),
  side: 64,
  skins: SKINS.map((skin) => ({ ...skin, ...ARROW_DESIGNS[skin.id] })),
  inks: MATERIAL_INKS,
  palettes: ARROW_COLORS,
  cases,
};
writeFileSync(
  new URL('../data/art-reference.json', import.meta.url),
  JSON.stringify(output) + '\n',
);
console.log(`Recorded original cosmeticExit: ${cases.length} cases, ${SKINS.length} skins.`);
