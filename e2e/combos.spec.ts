import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { solve } from '../src/solver/solver';
import type { Direction } from '../src/core/types';

async function enterArena(page: Page): Promise<readonly string[]> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await page.getByRole('button', { name: /Reta a alguien/ }).click();
  await page.getByLabel('DALE UNA SEMILLA').fill('combo-arena-030');
  await page.getByLabel('TAMAÑO DEL TABLERO').selectOption('10');
  await page.getByRole('button', { name: 'Crear mi reto' }).click();
  await page.getByRole('button', { name: 'Jugar este reto' }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(70);
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
  return solve({ width: 10, height: 10, arrows }).sequence;
}

test('frenzy escalates without moving touch targets, caps particles and clears on pause', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const sequence = await enterArena(page);
  const snapshot = await page.evaluate((ids) => {
    const fixed = document.querySelector<HTMLElement>(`[data-arrow="${ids[20]}"]`)!;
    const before = fixed.getBoundingClientRect().toJSON();
    for (const id of ids.slice(0, 10))
      document.querySelector<HTMLButtonElement>(`[data-arrow="${id}"]`)!.click();
    return {
      before,
      after: fixed.getBoundingClientRect().toJSON(),
      count: document.querySelector('[data-combo]')!.textContent,
      title: document.querySelector('[data-frenzy-title]')!.textContent,
      particles: document.querySelectorAll('.combo-spark').length,
      fx: document.querySelector('.screen-fx')?.getAttribute('data-tier'),
    };
  }, sequence);
  expect(snapshot.before).toEqual(snapshot.after);
  expect(snapshot.count).toBe('COMBO ×10');
  expect(snapshot.title).toBe('IMPARABLE');
  expect(snapshot.fx).toBe('unstoppable');
  expect(snapshot.particles).toBeLessThanOrEqual(72);
  await page.screenshot({ path: `.artifacts/frenzy-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('.screen-fx')).toHaveCount(0);
  await expect(page.locator('[data-frenzy-title]')).toHaveText('ENCUENTRA EL RITMO');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('[data-combo]')).toBeHidden();
});

test('system reduced motion preserves combos while suppressing screen effects', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sequence = await enterArena(page);
  const state = await page.evaluate((ids) => {
    for (const id of ids.slice(0, 7))
      document.querySelector<HTMLButtonElement>(`[data-arrow="${id}"]`)!.click();
    return {
      label: document.querySelector('[data-combo]')!.textContent,
      effects: document.querySelectorAll('.screen-fx').length,
      count: document.querySelectorAll('[data-arrow]').length,
    };
  }, sequence);
  expect(state.label).toBe('COMBO ×7');
  expect(state.effects).toBe(0);
  expect(state.count).toBe(63);
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
});
