import { expect, test } from '@playwright/test';
import { defaultProfile, SAVE_KEY } from '../src/services/progress';
import { WORLD_NAMES } from '../src/config/worlds';

test('seasonal ambience pauses behind dialogs and respects reduced motion', async ({
  page,
}, info) => {
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.settings.world = 'christmas';
  profile.events.ownedWorlds = [...WORLD_NAMES];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: SAVE_KEY,
    value: profile,
  });
  await page.goto('/');
  const motes = page.locator('.world-backdrop > .world-svg .world-ambience > g');
  await expect(motes).toHaveCount(16);
  await expect(motes.first()).toHaveCSS('animation-play-state', 'running');
  await page.screenshot({ path: `.artifacts/040-home-${info.project.name}.png` });
  await page.getByRole('button', { name: /Navidad. Halloween. Tu mundo./ }).click();
  const thumbnailMote = page.locator('[data-world-card="christmas"] .world-ambience > g').first();
  await expect(thumbnailMote).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Vista previa de Noche de Navidad', exact: true }).click();
  await expect(motes.first()).toHaveCSS('animation-play-state', 'paused');
  await expect(page.locator('.world-preview-art .world-ambience > g').first()).toHaveCSS(
    'animation-play-state',
    'running',
  );
  await expect(page.locator('.world-preview-board [data-skin-art="classic"]')).toHaveCount(9);
  await page.getByRole('button', { name: 'Volver a los fondos' }).click();
  await page.getByRole('button', { name: 'Abrir ajustes', exact: true }).click();
  await page.getByRole('switch', { name: /Reducir movimiento/ }).click();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(motes.first()).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Vista previa de Noche de Navidad', exact: true }).click();
  await expect(page.locator('.world-preview-art .world-ambience > g').first()).toHaveCSS(
    'animation-name',
    'none',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('home artwork uses the equipped material and stays usable on a narrow screen', async ({
  page,
}, info) => {
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.settings.skin = 'royal';
  profile.economy.collection.ownedSkins.push('royal');
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: SAVE_KEY,
    value: profile,
  });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await expect(page.locator('.hero-board [data-skin-art="royal"]')).toHaveCount(8);
  await expect(page.locator('.hero-play')).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: `.artifacts/040-home-narrow-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('[data-arrow]').first()).toBeVisible();
  await page.screenshot({ path: `.artifacts/040-royal-board-${info.project.name}.png` });
});
