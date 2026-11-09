import './export-reference.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
const ref = '3c00af2b630ff1a5f7ef1397a4c057ecf0bc54ce';
const path = 'src/core/special-arrow.ts';
const response = JSON.parse(
  execFileSync('gh', ['api', `repos/MirkovicV2/flecha-trampa/contents/${path}?ref=${ref}`], {
    encoding: 'utf8',
  }),
);
const source = Buffer.from(response.content, 'base64').toString('utf8');
const randomUrl = new URL('../../src/utils/random.ts', import.meta.url).href;
const js = stripTypeScriptTypes(source).replace("'../utils/random'", JSON.stringify(randomUrl));
const powers = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { generateLevel } = await import('../../src/generator/generator.ts');
const { classicConfigForLevel } = await import('../../src/generator/config.ts');
const runId = '00000000-0000-4000-8000-000000000001';
const boards = new Map();
const boardForLevel = (n) => {
  if (!boards.has(n))
    boards.set(n, generateLevel(`classic:${runId}:${n}`, classicConfigForLevel(n)).board);
  return boards.get(n);
};
const powerRunId = 'classic:' + runId;
const sequence = powers.createPowerSequence(powerRunId, boardForLevel);
const fixtures = Array.from({ length: 8 }, (_, i) => {
  const level = i + 1,
    kind = sequence(level),
    board = boardForLevel(level);
  const id = kind ? powers.selectPowerArrow(board, level, kind) : null;
  return {
    level,
    kind,
    id,
    targets: id
      ? powers
          .specialArrowTargets(
            board,
            board.arrows.find((a) => a.id === id),
            kind,
          )
          .map((a) => a.id)
      : [],
  };
});
writeFileSync(
  new URL('../data/power-fixtures.json', import.meta.url),
  JSON.stringify(
    {
      ref,
      path,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      runId,
      powerRunId,
      fixtures,
    },
    null,
    2,
  ) + '\n',
);
console.log('Exported commercial eligible-v1 power fixtures from exact SHA.');
