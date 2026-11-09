import { registerHooks } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Node 24's type stripper executes the unchanged classic reference, without npm.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier + '.ts', context.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});
const { SKINS, SKIN_COST } = await import('../../src/config/collection.ts');
const { ARROW_DESIGNS } = await import('../../src/config/arrow-designs.ts');
const { WORLDS } = await import('../../src/config/worlds.ts');
const { defaultProfile } = await import('../../src/services/progress.ts');
const { PASS_TIERS } = await import('../../src/config/pass.ts');
const { generateLevel } = await import('../../src/generator/generator.ts');
const { classicConfigForLevel } = await import('../../src/generator/config.ts');
mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
const write = (name, value) =>
  writeFileSync(new URL('../data/' + name, import.meta.url), JSON.stringify(value, null, 2) + '\n');
write('catalog.json', {
  skins: SKINS.map((s) => ({ ...s, cost: SKIN_COST[s.rarity], ...ARROW_DESIGNS[s.id] })),
  worlds: WORLDS,
  pass: PASS_TIERS,
});
const profile = defaultProfile();
profile.runId = '00000000-0000-4000-8000-000000000001';
profile.economy.energy.updatedAt = 0;
write('classic-profile-example.json', profile);
write(
  'generator-fixtures.json',
  [1, 2, 3, 5, 8, 16, 31].map((level) => {
    const config = classicConfigForLevel(level);
    const seed = `classic:fixture:${level}`;
    return { level, seed, config, board: generateLevel(seed, config).board };
  }),
);
write(
  'fallback-fixtures.json',
  [1, 3, 16, 31].map((level) => {
    const config = classicConfigForLevel(level);
    const seed = `fallback:fixture:${level}`;
    return { seed, config, board: generateLevel(seed, config, 0).board };
  }),
);
console.log('Exported 32 original designs, 7 worlds and classic generator fixtures.');
