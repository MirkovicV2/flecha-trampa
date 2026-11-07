import { expect, test } from '@playwright/test';

test('previews every event, unlocks a free background and restores it without changing energy', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await page.getByRole('button', { name: /Navidad. Halloween. Tu mundo./ }).click();
  await expect(page.locator('[data-stamps]')).toHaveText('1');
  for (const name of [
    'Noche de Navidad',
    'Medianoche encantada',
    'Jardín de sakura',
    'Distrito neón',
    'Abismo de cristal',
    'Festival de faroles',
  ]) {
    await page.getByRole('button', { name: `Vista previa de ${name}`, exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name })).toBeVisible();
    await expect(page.locator('.world-preview-art .world-svg')).toBeVisible();
    if (name === 'Medianoche encantada') {
      await expect(page.getByRole('button', { name: 'Te faltan 2 sellos' })).toBeDisabled();
      await page.screenshot({
        path: `.artifacts/world-halloween-${testInfo.project.name}.png`,
        fullPage: true,
      });
    }
    await page.getByRole('button', { name: 'Volver a los fondos' }).click();
  }
  await page
    .locator('[data-world-card="christmas"]')
    .getByRole('button', { name: /Desbloquear/ })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-world', 'christmas');
  await expect(page.locator('[data-energy-amount]')).toHaveText('5/5');
  await expect(page.locator('[data-stamps]')).toHaveText('0');
  await page.screenshot({
    path: `.artifacts/world-gallery-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-world', 'christmas');
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]').first()).toBeVisible();
  await expect(page.locator('[data-energy-amount]')).toHaveText('4/5');
  await page.screenshot({
    path: `.artifacts/world-christmas-game-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
