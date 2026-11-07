import { build } from 'vite';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

await build({
  configFile: false,
  logLevel: 'error',
  build: {
    outDir: '.artifacts/balance-modules',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: {
        generator: resolve('src/generator/generator.ts'),
        config: resolve('src/generator/config.ts'),
      },
      formats: ['es'],
      fileName: (_format, name) => name + '.mjs',
    },
  },
});
{
  const { generateLevel } = await import(
    pathToFileURL(resolve('.artifacts/balance-modules/generator.mjs')).href
  );
  const { classicConfigForLevel, configForLevel } = await import(
    pathToFileURL(resolve('.artifacts/balance-modules/config.mjs')).href
  );
  const shapes = ['diamond', 'cross', 'ring', 'hourglass', 'square'];
  const oldConfig = (level) => {
    const c = configForLevel(level);
    if (level < 3) return c;
    const shape = shapes[(level - 3) % 5];
    return {
      ...c,
      shape,
      density: shape === 'square' ? c.density : Math.min(0.94, c.density + 0.16),
    };
  };
  const report = [];
  for (const [min, max] of [
    [2, 5],
    [6, 15],
    [16, 30],
    [31, 60],
    [61, 150],
  ]) {
    const row = { levels: `${min}–${max}`, seeds: 100 };
    for (const [name, config] of [
      ['v05', oldConfig],
      ['v06', classicConfigForLevel],
    ]) {
      let arrows = 0,
        depth = 0,
        moves = 0,
        deps = 0,
        fallbacks = 0;
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        const g = generateLevel(`balance-060-${i}`, config(min + (i % (max - min + 1))));
        if (!g.solution.solvable) throw Error('Unsolvable');
        arrows += g.board.arrows.length;
        depth += g.solution.depth;
        moves += g.solution.initialMoves / g.board.arrows.length;
        deps += g.solution.dependencies / g.board.arrows.length;
        fallbacks += Number(g.fallback);
      }
      row[name] = {
        arrows: +(arrows / 100).toFixed(2),
        depth: +(depth / 100).toFixed(2),
        initialMovesPercent: +moves.toFixed(2),
        dependenciesPerArrow: +(deps / 100).toFixed(2),
        fallbacks,
        msPerBoard: +((performance.now() - start) / 100).toFixed(2),
      };
    }
    report.push(row);
  }
  mkdirSync('.artifacts', { recursive: true });
  writeFileSync('.artifacts/difficulty-060.json', JSON.stringify(report, null, 2));
  console.table(
    report.map((r) => ({
      levels: r.levels,
      arrows: `${r.v05.arrows} → ${r.v06.arrows}`,
      depth: `${r.v05.depth} → ${r.v06.depth}`,
      initialMoves: `${r.v05.initialMovesPercent}% → ${r.v06.initialMovesPercent}%`,
      fallbacks: r.v06.fallbacks,
      ms: r.v06.msPerBoard,
    })),
  );
}
