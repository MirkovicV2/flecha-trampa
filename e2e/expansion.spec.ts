import { expect, test } from '@playwright/test';
import { defaultProfile, SAVE_KEY } from '../src/services/progress';
import { buildChallengeUrl, createChallenge } from '../src/services/challenges';
import { generateLevel } from '../src/generator/generator';
import { solve } from '../src/solver/solver';
import { classicConfigForLevel } from '../src/generator/config';

test('continues an old season, claims tier 40 on both tracks and keeps inventory after reload', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.economy.pass.xp = 4000;
  profile.economy.pass.claimed = ['free:1', 'free:10'];
  profile.economy.collection.ownedSkins.push('royal');
  await page.goto('/');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: SAVE_KEY,
    value: profile,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await expect(page.locator('[data-action="claim-reward"]')).toHaveCount(80);
  await expect(page.locator('.pass-xp')).toContainText('40 / 40');
  await page.getByRole('button', { name: 'Recoger gratis nivel 40', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recogido gratis nivel 40', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Recoger gratis nivel 16', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recoger Plus nivel 40', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Probar Pase Plus · 0 €' }).click();
  await page.getByRole('button', { name: 'Activar Pase Plus de prueba' }).click();
  await page.getByRole('button', { name: 'Recoger Plus nivel 40', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recogido Plus nivel 40', exact: true }),
  ).toBeDisabled();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.economy.collection.ownedSkins).toEqual(['classic', 'royal', 'phoenix', 'dragon']);
  expect(saved.events.stamps).toBe(4);
  expect(saved.economy.energy.amount).toBe(5);
  await page.screenshot({ path: `.artifacts/060-pass-finale-${info.project.name}.png` });
  await page.reload();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recogido gratis nivel 40', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await page.locator('[data-action="skin"][data-value="phoenix"]').click();
  await expect(page.locator('[data-collection-skin="phoenix"]')).toHaveClass(/selected/);
  await page.screenshot({ path: `.artifacts/060-phoenix-collection-${info.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('plays an FT3 tactical challenge and resumes its exact board without energy charges', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const config = { width: 5, height: 5, density: 0.9, complexity: 1, tuning: 'chain-v2' } as const;
  const spec = createChallenge('portable-060', config);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  const url = buildChallengeUrl(new URL(page.url()).origin, spec);
  await page.goto(url);
  await page.getByRole('button', { name: 'Jugar este reto' }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  const generated = generateLevel(spec.seed, config);
  const sequence = solve(generated.board).sequence;
  await page.locator(`[data-arrow="${sequence[0]}"]`).click();
  await page.reload();
  await page.goto(url);
  await page.getByRole('button', { name: 'Continuar este reto' }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(generated.board.arrows.length - 1);
  await page.screenshot({ path: `.artifacts/060-tactical-${info.project.name}.png` });
  for (const id of sequence.slice(1)) await page.locator(`[data-arrow="${id}"]`).click();
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.sharedSave.config.tuning).toBe('chain-v2');
  expect(saved.economy.energy.amount).toBe(5);
  expect(saved.economy.pass.xp).toBe(0);
});

test('keeps earning chest milestones after completing the pass without refunding energy', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.level = 15;
  profile.economy.pass.xp = 4000;
  await page.goto('/');
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: SAVE_KEY,
    value: profile,
  });
  await page.reload();
  await page.locator('[data-action=play]').click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  const board = generateLevel(`classic:${profile.runId}:15`, classicConfigForLevel(15)).board;
  for (const id of solve(board).sequence) await page.locator(`[data-arrow="${id}"]`).click();
  await expect(page.getByRole('dialog')).toContainText('+1 cofre');
  let saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.economy.collection.chests).toBe(2);
  expect(saved.economy.energy.amount).toBe(4);
  expect(saved.classicSave.rewardChests).toBe(1);
  await page.screenshot({ path: `.artifacts/070-milestone-supply-${info.project.name}.png` });
  await page.reload();
  saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.economy.collection.chests).toBe(2);
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await expect(page.locator('.chest-vault')).toContainText('2 cofres disponibles');
});
