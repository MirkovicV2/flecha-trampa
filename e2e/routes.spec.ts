import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { availableMoves, findBlocker } from '../src/core/board';
import type { Board, Direction } from '../src/core/types';
import { solve } from '../src/solver/solver';
import { BOARD_SHAPES, arrowCount, containsCell } from '../src/generator/shapes';
import type { BoardShape } from '../src/generator/shapes';
import { buildChallengeUrl, createChallenge, decodeChallenge } from '../src/services/challenges';

async function arena(page: Page, shape: BoardShape = 'square'): Promise<Board> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await page.getByRole('button', { name: /Reta a alguien/ }).click();
  await page.getByLabel('DALE UNA SEMILLA').fill('tactile-050');
  await page.getByLabel('TAMAÑO DEL TABLERO').selectOption('8');
  await page.getByLabel('FORMA DEL TABLERO').selectOption(shape);
  await page.getByRole('button', { name: 'Crear mi reto' }).click();
  const url = await page.getByLabel('Enlace del reto').inputValue();
  const encoded = new URLSearchParams(new URL(url).hash.slice(1)).get('reto')!;
  const spec = decodeChallenge(encoded);
  expect(spec.config.shape ?? 'square').toBe(shape);
  await page.getByRole('button', { name: 'Jugar este reto' }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(arrowCount(spec.config));
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
  return { width: 8, height: 8, arrows };
}

test('holding reads the actual first blocker without moving, spending hints or losing lives', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const board = await arena(page);
  const arrow = board.arrows.find((item) => findBlocker(board, item))!;
  const blocker = findBlocker(board, arrow)!;
  const button = page.locator(`[data-arrow="${arrow.id}"]`);
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('.route-overlay')).toHaveAttribute('data-state', 'blocked');
  await expect(page.locator('[data-route-status]')).toContainText(
    `fila ${blocker.y + 1}, columna ${blocker.x + 1}`,
  );
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
  await expect(page.locator('[data-hints]')).toHaveText('3');
  await page.screenshot({ path: `.artifacts/050-route-${info.project.name}.png` });
  await page.mouse.up();
  await expect(page.locator('.route-overlay svg')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length);
  await button.click();
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '2 vidas');
  await expect(page.locator('[data-route-status]')).toContainText('Choque');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('.route-overlay svg')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('route mode works with keyboard and cancelled drags never become moves', async ({ page }) => {
  const board = await arena(page);
  const id = availableMoves(board)[0]!.id;
  const arrow = page.locator(`[data-arrow="${id}"]`);
  await page.getByRole('button', { name: 'Rutas', exact: true }).click();
  await arrow.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.route-overlay')).toHaveAttribute('data-state', 'clear');
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length);
  await page.getByRole('button', { name: 'Rutas', exact: true }).click();
  const box = (await arrow.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 18, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length);
  await arrow.focus();
  await page.keyboard.press('Enter');
  await expect(arrow).toHaveCount(0);
  const valid = new Set(
    availableMoves({ ...board, arrows: board.arrows.filter((item) => item.id !== id) }).map(
      (item) => item.id,
    ),
  );
  for (const highlighted of await page
    .locator('.just-unlocked')
    .evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.arrow!)))
    expect(valid.has(highlighted)).toBe(true);
});

for (const shape of BOARD_SHAPES) {
  test(`${shape} silhouette survives reload, fits and can be completed`, async ({ page }, info) => {
    // Includes creation, restoration and up to 45 real pointer interactions.
    test.setTimeout(75000);
    const board = await arena(page, shape);
    for (const arrow of board.arrows)
      expect(containsCell(8, 8, shape, arrow.x, arrow.y)).toBe(true);
    await expect(page.locator('.board-frame')).toHaveAttribute('data-shape', shape);
    if (shape === 'diamond') {
      if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 720 });
      await page.screenshot({
        path: `.artifacts/050-${shape}-${info.project.name}.png`,
        fullPage: true,
      });
    }
    const sequence = solve(board).sequence;
    await page.locator(`[data-arrow="${sequence[0]}"]`).click();
    await page.reload();
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem('flecha-trampa:profile:v1')!).sharedSave,
    );
    expect(saved.config.shape ?? 'square').toBe(shape);
    expect(saved.state.board.arrows.length).toBe(board.arrows.length - 1);
    // The UI accepts the very same portable link after reloading.
    await page.goto(
      buildChallengeUrl(
        'http://127.0.0.1:5173/',
        createChallenge('tactile-050', {
          width: 8,
          height: 8,
          density: 0.7,
          complexity: 0.65,
          ...(shape === 'square' ? {} : { shape }),
        }),
      ).replace('http://127.0.0.1:5173', new URL(page.url()).origin),
    );
    await page.getByRole('button', { name: 'Continuar este reto' }).click();
    await expect(page.locator('.board-loading')).toHaveCount(0);
    for (const id of sequence.slice(1)) await page.locator(`[data-arrow="${id}"]`).click();
    await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
