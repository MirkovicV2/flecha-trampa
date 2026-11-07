import { expect, test } from '@playwright/test';
import { defaultProfile, SAVE_KEY } from '../src/services/progress';
import { solve } from '../src/solver/solver';
import { generateLevel } from '../src/generator/generator';
import { classicConfigForLevel } from '../src/generator/config';
import { findBlocker } from '../src/core/board';

for (const style of ['perfect', 'hint', 'error'] as const) {
  test(`${style} attempt earns accurate stars and durable statistics`, async ({ page }, info) => {
    const profile = defaultProfile();
    profile.tutorialDone = true;
    profile.level = 3;
    await page.goto('/');
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
      key: SAVE_KEY,
      value: profile,
    });
    await page.reload();
    await page.getByRole('button', { name: /Jugar ahora/ }).click();
    await expect(page.locator('.board-loading')).toHaveCount(0);
    await expect(page.locator('.board-frame')).toHaveAttribute('data-shape', 'diamond');
    const board = generateLevel(`classic:${profile.runId}:3`, classicConfigForLevel(3)).board;
    if (style === 'hint') {
      await page.getByRole('button', { name: 'Una pista', exact: false }).click();
      await expect(page.locator('[data-hints]')).toHaveText('2');
    }
    if (style === 'error') {
      const arrow = board.arrows.find((item) => findBlocker(board, item))!;
      await page.locator(`[data-arrow="${arrow.id}"]`).click();
      await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '2 vidas');
    }
    for (const id of solve(board).sequence) await page.locator(`[data-arrow="${id}"]`).click();
    const stars = style === 'perfect' ? 3 : style === 'hint' ? 2 : 1;
    await expect(page.getByRole('img', { name: `${stars} de 3 estrellas` })).toBeVisible();
    await expect(page.locator('.mastery-star.earned')).toHaveCount(stars);
    if (style === 'perfect')
      await page.screenshot({ path: `.artifacts/050-mastery-${info.project.name}.png` });
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
    await page.reload();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.stats.mastered).toBe(style === 'perfect' ? 1 : 0);
    expect(saved.classicSave.hintsUsed).toBe(style === 'hint' ? 1 : 0);
    expect(saved.classicSave.bestCombo).toBeGreaterThanOrEqual(1);
    expect(saved.level).toBe(4);
    await page.getByRole('button', { name: 'Tu progreso', exact: true }).click();
    await expect(page.getByText('Victorias de 3 estrellas', { exact: true })).toBeVisible();
  });
}
