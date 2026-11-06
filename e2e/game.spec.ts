import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { availableMoves } from '../src/core/board';
import type { Board, Direction } from '../src/core/types';
import { solve } from '../src/solver/solver';

async function skipTutorial(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
}

async function readBoard(page: Page): Promise<Board> {
  await expect(page.locator('.board-loading')).toHaveCount(0);
  const arrows = await page.locator('[data-arrow]').evaluateAll((buttons) => buttons.map((button) => {
    const data = (button as HTMLElement).dataset;
    return { id: data.arrow!, x: Number(data.x), y: Number(data.y), direction: data.direction as Direction };
  }));
  return { width: 10, height: 10, arrows };
}

async function solveCurrent(page: Page): Promise<void> {
  const board = await readBoard(page);
  for (const id of solve(board).sequence) {
    const cell = page.locator(`[data-arrow="${id}"]`);
    await expect(cell).toBeEnabled();
    await cell.click();
  }
}

test('interactive tutorial teaches a dependency chain and starts classic', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Aprender jugando' }).click();
  await expect(page.locator('[data-arrow]')).toHaveCount(3);
  await solveCurrent(page);
  await expect(page.getByRole('dialog')).toContainText('YA TIENES LA CLAVE');
  await page.getByRole('button', { name: 'Empezar mi aventura' }).click();
  await expect(page.locator('.level-chip')).toContainText('NIVEL 01');
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
  expect(errors).toEqual([]);
});

test('blocked moves cost lives and defeat can be restarted', async ({ page }) => {
  await skipTutorial(page);
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  const board = await readBoard(page);
  const valid = new Set(availableMoves(board).map((arrow) => arrow.id));
  const blocked = board.arrows.find((arrow) => !valid.has(arrow.id))!;
  expect(blocked).toBeTruthy();
  for (let lives = 2; lives >= 0; lives--) {
    await page.locator(`[data-arrow="${blocked.id}"]`).click();
    await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', `${lives} vidas`);
  }
  await expect(page.getByRole('dialog')).toContainText('La salida');
  await page.getByRole('button', { name: 'Volver a intentarlo' }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
});

test('hints identify a legal move and pause freezes the timer', async ({ page }) => {
  await skipTutorial(page);
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  const before = await readBoard(page);
  await page.getByRole('button', { name: 'Una pista' }).click();
  await expect(page.locator('[data-hints]')).toHaveText('2');
  await expect(page.locator('[data-arrow]')).toHaveCount(before.arrows.length);
  const highlighted = await page.locator('.hinted').getAttribute('data-arrow');
  expect(availableMoves(before).some((arrow) => arrow.id === highlighted)).toBe(true);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const time = await page.locator('[data-timer]').textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator('[data-timer]')).toHaveText(time!);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await solveCurrent(page);
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  await page.getByRole('button', { name: 'Siguiente nivel' }).click();
  await expect(page.locator('.level-chip')).toContainText('NIVEL 02');
});

test('home and settings fit portrait screens and all navigation works', async ({ page }, testInfo) => {
  await skipTutorial(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `.artifacts/home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Abrir ajustes' }).click();
  const sound = page.getByRole('switch', { name: /Sonido/ });
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Modos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A tu manera.' })).toBeVisible();
  await page.getByRole('button', { name: 'Tu progreso', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu camino.' })).toBeVisible();
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await readBoard(page);
  await page.screenshot({ path: `.artifacts/game-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('reload restores the exact board, hints, settings and one counted start', async ({ page }) => {
  await skipTutorial(page);
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  const board = await readBoard(page);
  const first = solve(board).sequence[0]!;
  await page.locator(`[data-arrow="${first}"]`).click();
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length - 1);
  await page.getByRole('button', { name: 'Una pista' }).click();
  await page.reload();
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await readBoard(page);
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length - 1);
  await expect(page.locator(`[data-arrow="${first}"]`)).toHaveCount(0);
  await expect(page.locator('[data-hints]')).toHaveText('2');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Tu progreso', exact: true }).click();
  await expect(page.locator('.stat-card').filter({ hasText: 'Partidas jugadas' }).locator('strong')).toHaveText('1');
});

test('daily challenge resumes and keeps a completed result after reload', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipTutorial(page);
  await page.getByRole('button', { name: /El reto de hoy/ }).click();
  await page.screenshot({ path: `.artifacts/daily-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Aceptar el reto' }).click();
  await expect(page.locator('.level-chip')).toHaveText('DIARIO · UTC');
  const board = await readBoard(page);
  const first = solve(board).sequence[0]!;
  await page.locator(`[data-arrow="${first}"]`).click();
  await page.reload();
  await page.getByRole('button', { name: /El reto de hoy/ }).click();
  await page.getByRole('button', { name: 'Continuar el reto' }).click();
  await readBoard(page);
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length - 1);
  await solveCurrent(page);
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  await page.getByRole('button', { name: 'Volver al desafío' }).click();
  await expect(page.locator('.daily-feature')).toContainText('superado');
  await page.reload();
  await page.getByRole('button', { name: /El reto de hoy/ }).click();
  await expect(page.locator('.daily-feature')).toContainText('MEJOR RESULTADO');
  await expect(page.locator('.daily-streak')).toContainText('1 días de racha');
});

test('a shared link reproduces a board and shares an actual result', async ({ page, context }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipTutorial(page);
  await page.getByRole('button', { name: /Reta a alguien/ }).click();
  await page.getByLabel('DALE UNA SEMILLA').fill('viernes entre amigos');
  await page.getByLabel('TAMAÑO DEL TABLERO').selectOption('4');
  await page.getByRole('combobox', { name: 'DENSIDAD', exact: true }).selectOption('0.55');
  await page.getByRole('button', { name: 'Crear mi reto' }).click();
  const url = await page.getByRole('textbox', { name: 'Enlace del reto' }).inputValue();
  expect(url).toContain('#reto=FT1.');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { sessionStorage.setItem('test:copied', value); } } }));
  await page.getByRole('button', { name: 'Copiar enlace', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('test:copied'))).toBe(url);
  await page.screenshot({ path: `.artifacts/shared-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Jugar este reto' }).click();
  const original = await readBoard(page);
  const receiver = await context.newPage();
  await receiver.emulateMedia({ reducedMotion: 'reduce' });
  await receiver.goto(url);
  await expect(receiver.getByRole('heading', { name: 'viernes entre amigos' })).toBeVisible();
  await receiver.getByRole('button', { name: /Continuar este reto|Jugar este reto/ }).click();
  expect(await readBoard(receiver)).toEqual(original);
  await solveCurrent(receiver);
  await expect(receiver.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  await receiver.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { sessionStorage.setItem('test:result', value); } } });
  });
  await receiver.getByRole('button', { name: 'Compartir resultado', exact: true }).click();
  await expect(receiver.locator('.toast')).toContainText('Resultado y enlace copiados');
  expect(await receiver.evaluate(() => sessionStorage.getItem('test:result'))).toContain('Errores: 0');
  await receiver.close();
});
