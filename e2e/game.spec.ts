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
  await expect(page.locator('[data-arrow]').first()).toBeVisible();
  await expect(page.locator('.board-loading')).toHaveCount(0);
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
  await expect(page.locator('.commerce-card')).toContainText('Intersticial de prueba');
  await page.getByRole('button', { name: 'Cerrar vista previa', exact: true }).click();
  await expect(page.locator('.level-chip')).toContainText('NIVEL 02');
});

test('home and settings fit portrait screens and all navigation works', async ({
  page,
}, testInfo) => {
  await skipTutorial(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('pausing in-flight arrows resumes rendering and still completes the level', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await skipTutorial(page);
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  const board = await readBoard(page);
  const first = solve(board).sequence.slice(0, 2);
  await page.evaluate((ids) => {
    for (const id of ids)
      document.querySelector<HTMLButtonElement>(`[data-arrow="${id}"]`)!.click();
    document.querySelector<HTMLButtonElement>('[data-action="pause"]')!.click();
  }, first);
  await expect(page.getByRole('dialog')).toContainText('Un pequeño');
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length - 2);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await solveCurrent(page);
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await readBoard(page);
  expect(errors).toEqual([]);
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
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Partidas jugadas' }).locator('strong'),
  ).toHaveText('1');
});

test('daily challenge resumes and keeps a completed result after reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
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

test('a shared link reproduces a board and shares an actual result', async ({
  page,
  context,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipTutorial(page);
  await page.getByRole('button', { name: /Reta a alguien/ }).click();
  await page.getByLabel('DALE UNA SEMILLA').fill('viernes entre amigos');
  await page.getByLabel('TAMAÑO DEL TABLERO').selectOption('4');
  await page.getByRole('combobox', { name: 'DENSIDAD', exact: true }).selectOption('0.55');
  await page.getByRole('button', { name: 'Crear mi reto' }).click();
  const url = await page.getByRole('textbox', { name: 'Enlace del reto' }).inputValue();
  expect(url).toContain('#reto=FT1.');
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          sessionStorage.setItem('test:copied', value);
        },
      },
    }),
  );
  await page.getByRole('button', { name: 'Copiar enlace', exact: true }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('test:copied'))).toBe(url);
  await page.screenshot({ path: `.artifacts/shared-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Jugar este reto' }).click();
  const original = await readBoard(page);
  // Model switching away from the first tab, which is not automatic in headless Chromium.
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
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
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          sessionStorage.setItem('test:result', value);
        },
      },
    });
  });
  await receiver.getByRole('button', { name: 'Compartir resultado', exact: true }).click();
  await expect(receiver.locator('.toast')).toContainText('Resultado y enlace copiados');
  expect(await receiver.evaluate(() => sessionStorage.getItem('test:result'))).toContain(
    'Errores: 0',
  );
  await receiver.close();
});

test('fast repeated input cannot remove an arrow twice or lose extra lives', async ({ page }) => {
  await skipTutorial(page);
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  const board = await readBoard(page);
  const valid = availableMoves(board)[0]!;
  await page.locator(`[data-arrow="${valid.id}"]`).evaluate((button) => {
    for (let i = 0; i < 12; i++) (button as HTMLButtonElement).click();
  });
  await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length - 1);
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
});

test('a second tab preserves its newer progress and prompts the stale tab to reload', async ({
  page,
  context,
}) => {
  await skipTutorial(page);
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await readBoard(page);
  // Each headless page remains visible. Pause explicitly to model leaving the first tab.
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const second = await context.newPage();
  await second.emulateMedia({ reducedMotion: 'reduce' });
  await second.goto('/');
  await second.getByRole('button', { name: /Continuar partida/ }).click();
  const board = await readBoard(second);
  const firstMove = solve(board).sequence[0]!;
  await second.locator(`[data-arrow="${firstMove}"]`).click();
  await expect(page.getByRole('dialog')).toContainText('Otra pestaña');
  await second.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Recuperar el progreso' }).click();
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await readBoard(page);
  await expect(page.locator(`[data-arrow="${firstMove}"]`)).toHaveCount(0);
  await second.close();
});

test('portrait layouts keep a dense board inside the viewport', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipTutorial(page);
  for (const width of [320, 360, 375, 428]) {
    await page.setViewportSize({ width, height: 812 });
    await page.getByRole('button', { name: /Reta a alguien/ }).click();
    const createAnother = page.getByRole('button', { name: 'Crear otro reto' });
    if (await createAnother.count()) await createAnother.click();
    await page.getByRole('combobox', { name: 'TAMAÑO DEL TABLERO' }).selectOption('10');
    await page.getByRole('combobox', { name: 'DENSIDAD', exact: true }).selectOption('0.85');
    await page.getByRole('button', { name: 'Crear mi reto' }).click();
    await page.getByRole('button', { name: 'Jugar este reto' }).click();
    await readBoard(page);
    await expect(page.locator('[data-arrow]')).toHaveCount(85);
    const bounds = await page.locator('.board-frame').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width === 360)
      await page.screenshot({
        path: `.artifacts/dense-360-${testInfo.project.name}.png`,
        fullPage: true,
      });
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  }
});

test.describe('finger input', () => {
  test.use({ hasTouch: true });

  test('accepts several real taps while arrows are flying and keeps a combo', async ({ page }) => {
    await skipTutorial(page);
    await page.getByRole('button', { name: /Jugar ahora/ }).click();
    const board = await readBoard(page);
    const sequence = solve(board).sequence.slice(0, 3);
    const untouched = board.arrows.find((arrow) => !sequence.includes(arrow.id))!;
    const stable = await page.locator(`[data-arrow="${untouched.id}"]`).elementHandle();
    const points = await page.locator('[data-arrow]').evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          id: (button as HTMLElement).dataset.arrow,
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
      }),
    );
    for (const id of sequence) {
      const point = points.find((item) => item.id === id)!;
      await page.touchscreen.tap(point.x, point.y);
    }
    await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length - 3);
    await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
    await expect(page.locator('[data-combo]')).toHaveText('COMBO ×3');
    expect(await stable!.evaluate((button) => button.isConnected)).toBe(true);
  });

  test('scrolling a finger over an arrow never consumes a move and zoom enlarges targets', async ({
    page,
  }) => {
    await skipTutorial(page);
    await page.getByRole('button', { name: /Jugar ahora/ }).click();
    const board = await readBoard(page);
    const box = (await page.locator('[data-arrow]').first().boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x, y: point.y - 50 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('[data-arrow]')).toHaveCount(board.arrows.length);
    await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
    await page.getByRole('button', { name: 'Ampliar tablero' }).click();
    await expect(page.getByRole('button', { name: 'Ver tablero completo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const enlarged = (await page.locator('[data-arrow]').first().boundingBox())!;
    expect(enlarged.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await cdp.detach();
  });
});

test('a classic win refunds energy, earns pass XP and claims a reward only once', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await skipTutorial(page);
  await expect(page.locator('[data-energy-amount]')).toHaveText('5/5');
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await readBoard(page);
  await expect(page.locator('[data-energy-amount]')).toHaveText('4/5');
  await solveCurrent(page);
  await expect(page.getByRole('dialog')).toContainText('+125 XP');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await expect(page.locator('[data-pass-xp]')).toHaveText('125 XP');
  await expect(
    page.getByRole('button', { name: 'Recoger Plus nivel 1', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Probar Pase Plus · 0 €' })).toBeEnabled();
  await page.getByRole('button', { name: 'Recoger gratis nivel 1', exact: true }).click();
  await expect(page.locator('[data-energy-amount]')).toHaveText('7/5');
  await expect(
    page.getByRole('button', { name: 'Recogido gratis nivel 1', exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: `.artifacts/pass-${testInfo.project.name}.png`, fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await expect(page.locator('[data-pass-xp]')).toHaveText('125 XP');
  await expect(page.locator('[data-energy-amount]')).toHaveText('7/5');
  await expect(
    page.getByRole('button', { name: 'Recogido gratis nivel 1', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Restaurar compras' }).click();
  await expect(page.locator('.toast')).toContainText('No hay compras');
});

test('opens an earned chest, equips an actual skin and persists a full visual theme', async ({
  page,
}, testInfo) => {
  await skipTutorial(page);
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await expect(page.locator('.chest-odds')).toContainText('60%');
  await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
  await expect(page.getByRole('dialog')).toContainText('NUEVA SKIN');
  await page.screenshot({ path: `.artifacts/chest-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Equipar skin', exact: true }).click();
  await expect(page.locator('[data-action="open-chest"]')).toBeDisabled();
  const equipped = await page.locator('.skin-card.selected .skin-equip').getAttribute('data-value');
  expect(equipped).not.toBe('classic');
  await page.getByRole('button', { name: 'Neón', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon');
  await page.screenshot({
    path: `.artifacts/collection-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon');
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await expect(page.locator('.skin-card.selected .skin-equip')).toHaveAttribute(
    'data-value',
    equipped!,
  );
  await expect(page.locator('[data-action="open-chest"]')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('empty energy prevents charging a new game but permits free practice', async ({ page }) => {
  await skipTutorial(page);
  await page.evaluate(() => {
    const key = 'flecha-trampa:profile:v1';
    const profile = JSON.parse(localStorage.getItem(key)!);
    profile.economy.energy = { amount: 0, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(profile));
  });
  await page.reload();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Recarga');
  await expect(page.locator('[data-energy-wait]')).toHaveText(/0[9]:[0-5][0-9]|10:00/);
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Recarga');
  await page.getByRole('button', { name: 'Practicar sin energía', exact: true }).click();
  await readBoard(page);
  await expect(page.locator('.level-chip')).toHaveText('ENTRE AMIGOS');
  await expect(page.locator('[data-energy-amount]')).toHaveText('0/5');
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
});

test('free pass extra lives persist and are used only on a new classic attempt', async ({
  page,
}, testInfo) => {
  await skipTutorial(page);
  await page.evaluate(() => {
    const key = 'flecha-trampa:profile:v1';
    const profile = JSON.parse(localStorage.getItem(key)!);
    profile.economy.pass.xp = 400;
    localStorage.setItem(key, JSON.stringify(profile));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Recoger gratis nivel 4', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('2 vidas extra');
  await page.getByRole('button', { name: 'Inicio', exact: true }).click();
  await page.getByRole('button', { name: /Jugar ahora/ }).click();
  await readBoard(page);
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '4 vidas');
  await page.screenshot({
    path: `.artifacts/extra-life-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await readBoard(page);
  await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '4 vidas');
  const tokens = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('flecha-trampa:profile:v1')!).economy.collection.lifeTokens,
  );
  expect(tokens).toBe(1);
});
