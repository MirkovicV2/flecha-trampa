import { expect, test } from '@playwright/test';
import type { Board, Direction } from '../src/core/types';
import { solve } from '../src/solver/solver';

test('modern navigation and play controls remain reachable across responsive widths', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  const settleDialog = async () => {
    await page.locator('.modal-card').evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
    });
  };
  const widths = info.project.name === 'mobile' ? [320, 360, 393, 428] : [1440];
  const fit = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  };
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 851 });
    await page.getByRole('button', { name: 'Ir al inicio', exact: true }).click();
    await expect(page.getByRole('button', { name: /Jugar ahora/ })).toBeInViewport();
    await fit();
    await page.screenshot({ path: `.artifacts/redesign/after-home-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Modos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A tu manera.' })).toBeVisible();
    await fit();
    await page.screenshot({ path: `.artifacts/redesign/after-modes-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
    await page.screenshot({ path: `.artifacts/redesign/after-pass-${width}.png` });
    await fit();
    await expect(page.locator('.pass-next')).toContainText('2 energía');
    await page.locator('.pass-rules summary').click();
    await expect(page.locator('.pass-rules')).toHaveAttribute('open', '');
    await expect(page.locator('.pass-rules')).toContainText('100 XP');
    await page.locator('.pass-rules summary').click();
    await page.getByRole('button', { name: 'Ver mis recompensas', exact: true }).click();
    await expect(page.locator('[data-pass-tier="1"]')).toBeInViewport();
    await page.getByRole('button', { name: 'Colección', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Abrir cofre', exact: true })).toBeEnabled();
    await fit();
    await page.screenshot({ path: `.artifacts/redesign/after-collection-${width}.png` });
    await page.getByRole('button', { name: 'Abrir ajustes', exact: true }).click();
    await expect(page.getByRole('switch', { name: /Reducir movimiento/ })).toBeVisible();
    await settleDialog();
    await page.screenshot({ path: `.artifacts/redesign/after-settings-${width}.png` });
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Ir al inicio', exact: true }).click();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await page.screenshot({ path: `.artifacts/redesign/after-game-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await settleDialog();
  await page.screenshot({ path: `.artifacts/redesign/after-pause-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
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
  const board: Board = { width: 4, height: 4, arrows };
  for (const id of solve(board).sequence) await page.locator(`[data-arrow="${id}"]`).click();
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  await settleDialog();
  await page.locator('.mastery-stars').evaluate(async (element) => {
    await Promise.all(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
  });
  await page.screenshot({ path: `.artifacts/redesign/after-result-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
  await page.getByRole('button', { name: 'Saltar animación', exact: true }).click();
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
  await page.screenshot({ path: `.artifacts/redesign/after-chest-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Equipar skin', exact: true }).click();
  expect(errors).toEqual([]);
});
