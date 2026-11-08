// Independent geometry check of the fixed source fixture; does not execute GDScript.
// Run from any directory: node godot/tests/verify-fixture.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../scripts/rules.gd', import.meta.url), 'utf8');
const gems = JSON.parse(`[${source.match(/const FAMILIES := \[([^\]]+)\]/)[1]}]`);
assert.equal(gems.length, 25);

function matches(board) {
  const union = new Set();
  for (let i = 0; i < 25; i++) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      let x = i % 5;
      let y = Math.floor(i / 5);
      const run = [];
      while (x < 5 && y < 5 && board[y * 5 + x] >= 0 && board[y * 5 + x] === board[i]) {
        run.push(y * 5 + x);
        x += dx;
        y += dy;
      }
      if (run.length >= 3) run.forEach((cell) => union.add(cell));
    }
  }
  return [...union];
}

assert.equal(matches(gems).length, 0, 'No automatic initial matches');
const swapped = [...gems];
[swapped[1], swapped[6]] = [swapped[6], swapped[1]];
assert.deepEqual(matches(swapped), [0, 1, 2], 'Known initial valid swap');

// Fail when source directions change, requiring review of this separate geometry oracle.
assert.ok(source.includes('directions.append(3 if row == 0 else (1 if row == 4 else (0 if row % 2 == 0 else 2)))'));
const directions = Array.from({ length: 25 }, (_, cell) => {
  const row = Math.floor(cell / 5);
  return row === 0 ? 3 : row === 4 ? 1 : row % 2 === 0 ? 0 : 2;
});
function blocks(a, b) {
  const x = a % 5;
  const y = Math.floor(a / 5);
  const bx = b % 5;
  const by = Math.floor(b / 5);
  return a !== b && [by === y && bx > x, bx === x && by > y, by === y && bx < x, bx === x && by < y][directions[a]];
}

let remaining = Array.from({ length: 25 }, (_, cell) => cell);
const solution = [];
while (remaining.length) {
  const free = remaining.find((a) => !remaining.some((b) => blocks(a, b)));
  assert.notEqual(free, undefined, 'No dependency cycle');
  solution.push(free);
  remaining = remaining.filter((cell) => cell !== free);
}
for (const removed of [[], matches(swapped)]) {
  remaining = solution.filter((cell) => !removed.includes(cell));
  for (const cell of [...remaining]) {
    assert.ok(!remaining.some((other) => blocks(cell, other)), 'Solution remains legal after match');
    remaining = remaining.filter((other) => cell !== other);
  }
  assert.equal(remaining.length, 0);
}
console.log('Fixed fixture: no initial matches; valid three-match; complete acyclic extraction solution preserved after match.');
