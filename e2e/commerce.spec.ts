import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { solve } from '../src/solver/solver';
import type { Direction } from '../src/core/types';

async function setup(page: Page, empty = false): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await page.evaluate((empty) => {
    const key = 'flecha-trampa:profile:v1';
    const profile = JSON.parse(localStorage.getItem(key)!);
    profile.hints = 0;
    profile.economy.pass.xp = 125;
    if (empty) profile.economy.energy = { amount: 0, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(profile));
  }, empty);
  await page.reload();
}

async function clearBoard(page: Page): Promise<void> {
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]').first()).toBeVisible();
  const arrows = await page.locator('[data-arrow]').evaluateAll((buttons) =>
    buttons.map((button) => {
      const data = (button as HTMLElement).dataset;
      return {
        id: data.arrow!,
        x: Number(data.x),
        y: Number(data.y),
        direction: data.direction as Direction,
      };
    }),
  );
  for (const id of solve({ width: 10, height: 10, arrows }).sequence)
    await page.locator(`[data-arrow="${id}"]`).click();
}

test('rewarded previews cancel without rewards and grant energy and hints only after completion', async ({
  page,
}, testInfo) => {
  await setup(page, true);
  await page.getByRole('button', { name: 'Energía: 0 de 5', exact: true }).click();
  await page.getByRole('button', { name: 'Ver anuncio de prueba por energía' }).click();
  await expect(page.locator('.commerce-card')).toContainText('PRUEBA · SIN COBRO');
  await expect(page.locator('[data-preview-confirm]')).toBeDisabled();
  await page.getByRole('button', { name: 'Cerrar sin recompensa' }).click();
  await expect(page.locator('[data-energy-amount]').first()).toHaveText('0/5');
  await page.getByRole('button', { name: 'Ver anuncio de prueba por energía' }).click();
  await page.screenshot({
    path: `.artifacts/ad-preview-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Recoger +1 energía de prueba' }).click();
  await expect(page.locator('[data-energy-amount]').first()).toHaveText('1/5');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await page.getByRole('button', { name: /^Una pista/ }).click();
  await page.getByRole('button', { name: 'Ver anuncio de prueba por una pista' }).click();
  await page.getByRole('button', { name: 'Recoger +1 pista de prueba' }).click();
  await expect(page.locator('[data-hints]')).toHaveText('1');
  await page.reload();
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await expect(page.locator('[data-hints]')).toHaveText('1');
  await expect(page.locator('[data-energy-amount]')).toHaveText('0/5');
});

test('sandbox checkout cancels, activates, restores, grants four classic lives and skips interstitials', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Probar Pase Plus · 0 €' }).click();
  await expect(page.locator('.commerce-card')).toContainText('COMPRA DE PRUEBA');
  await expect(page.locator('.commerce-card input')).toHaveCount(0);
  await page.screenshot({
    path: `.artifacts/pass-checkout-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await expect(page.getByRole('button', { name: 'Probar Pase Plus · 0 €' })).toBeVisible();
  await page.getByRole('button', { name: 'Probar Pase Plus · 0 €' }).click();
  await page.getByRole('button', { name: 'Activar Pase Plus de prueba' }).click();
  await expect(page.locator('.premium-summary')).toContainText('Pase Plus de prueba activo');
  await expect(page.locator('[data-energy-amount]')).toHaveText('5/8');
  await page.getByRole('button', { name: 'Recoger Plus nivel 1', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Recogido Plus nivel 1', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await expect(page.locator('.premium-summary')).toContainText('Pase Plus de prueba activo');
  await page.getByRole('button', { name: 'Restaurar compras' }).click();
  await expect(page.locator('.toast')).toContainText('Pase de prueba restaurado');
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '4 vidas');
  await clearBoard(page);
  await page.getByRole('button', { name: 'Siguiente nivel' }).click();
  await expect(page.locator('.level-chip')).toContainText('NIVEL 02');
  await expect(page.locator('.commerce-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir ajustes' }).click();
  await page.getByRole('button', { name: 'Restablecer pase de prueba' }).click();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Probar Pase Plus · 0 €' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('leaving the foreground cancels an ad and its pending reward', async ({ page }) => {
  await setup(page, true);
  await page.getByRole('button', { name: 'Energía: 0 de 5', exact: true }).click();
  await page.getByRole('button', { name: 'Ver anuncio de prueba por energía' }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.commerce-card')).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('[data-energy-amount]').first()).toHaveText('0/5');
  await expect(page.locator('#app')).not.toHaveAttribute('inert');
});
