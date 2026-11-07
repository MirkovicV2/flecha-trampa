import { expect, test } from '@playwright/test';
import { SAVE_KEY } from '../src/services/progress';
import { solve } from '../src/solver/solver';
import type { PlaySession } from '../src/services/session';
import { newSession } from '../src/services/session';
import { classicConfigForLevel } from '../src/generator/config';
import { selectPowerArrow } from '../src/core/special-arrow';

test.setTimeout(90000);

test('empty eligible deal stays silent on resume and retry; legacy retry keeps its effect', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  const empty = newSession('classic', 1, 'classic:qa-eligibility-0:1', {
    width: 1,
    height: 1,
    density: 1,
    complexity: 0,
  });
  const legacy = newSession('classic', 1, 'classic:legacy-retry:1', classicConfigForLevel(1));
  delete legacy.powerPolicy;
  legacy.powerKind = 'nova';
  legacy.powerArrowId = selectPowerArrow(legacy.initialBoard, 1, 'nova');
  for (const fixture of [empty, legacy]) {
    await page.evaluate(
      ({ key, session }) => {
        const profile = JSON.parse(localStorage.getItem(key)!);
        profile.level = 1;
        profile.classicSave = session;
        profile.economy.energy.amount = 20;
        localStorage.setItem(key, JSON.stringify(profile));
      },
      { key: SAVE_KEY, session: fixture },
    );
    await page.reload();
    await page.locator('.hero-play').click();
    await expect(page.locator('.board-loading')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.locator('[data-action="restart"]').click();
    await expect(page.locator('.board-loading')).toHaveCount(0);
    const retried = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).classicSave as PlaySession,
      SAVE_KEY,
    );
    expect(retried.powerKind).toBe(fixture.powerKind);
    expect(retried.powerArrowId).toBe(fixture.powerArrowId);
    if (fixture === empty) {
      await expect(page.locator('.power-arrow-note')).toHaveCount(0);
      await expect(page.locator('.special-badge')).toHaveCount(0);
      await expect(page.locator('[data-game-status]')).not.toContainText(/Pulso|Rayo|Nova/);
    } else {
      await expect(page.locator('.power-arrow-note')).toContainText('Nova');
      await expect(page.locator('.power-arrow-note')).toContainText(
        'En cada grupo de tres niveles con objetivos válidos',
      );
    }
    await page.reload();
    await page.locator('.hero-play').click();
    await expect(page.locator('.board-loading')).toHaveCount(0);
    if (fixture === empty) await expect(page.locator('.power-arrow-note')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.locator('[data-action="home"]').click();
  }
});

test('commercial entry fits 320px and map supports touch, keyboard, chapters and safe resume', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  const play = page.locator('.hero-play');
  await expect(play).toContainText('Jugar nivel 1');
  const rect = await play.boundingBox();
  expect(rect!.y + rect!.height).toBeLessThan(568);
  await page.screenshot({ path: '.artifacts/commercial-review/home-320.png' });
  await page.locator('.home-map-button').click();
  await expect(page.locator('.map-node')).toHaveCount(10);
  await expect(page.locator('.map-selection')).toContainText('Coste: 1 energía');
  const mapCta = await page.locator('[data-action="map-play"]').boundingBox();
  const nav = await page.locator('.bottom-nav').boundingBox();
  expect(mapCta!.y + mapCta!.height).toBeLessThanOrEqual(nav!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.map-node[data-value="2"]').click();
  await expect(page.locator('.map-selection')).toContainText('Bloqueado');
  await expect(page.locator('[data-action="map-play"]')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.map-node[data-value="3"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('.map-node[data-value="10"]')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('.map-selection')).toContainText('Nivel 10');
  await page.getByRole('button', { name: 'Siguiente →', exact: true }).click();
  await expect(page.locator('.map-node').first()).toContainText('11');
  await page.getByRole('button', { name: 'Ir a mi nivel' }).click();
  // A compatibility click after a drag must not select or start a level.
  await page
    .locator('.map-node[data-value="2"]')
    .dispatchEvent('pointerdown', { clientX: 100, clientY: 100 });
  await page.locator('.map-scroll').dispatchEvent('pointermove', { clientX: 100, clientY: 160 });
  await page.locator('.map-node[data-value="2"]').dispatchEvent('pointerup');
  await page.locator('.map-node[data-value="2"]').dispatchEvent('click', { detail: 1 });
  await expect(page.locator('.map-selection')).toContainText('Nivel 1');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.artifacts/commercial-review/map-390.png', fullPage: true });
  await page.locator('[data-action="map-play"]').click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('.power-arrow-note')).toContainText('Una por nivel');
  await expect(page.locator('.special-badge')).toHaveCount(1);
  await expect(page.locator('.power-arrow-note')).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Entendido', exact: true }).click();
  await expect(page.locator('.power-arrow-note')).not.toHaveAttribute('open');
  const session = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).classicSave as PlaySession,
    SAVE_KEY,
  );
  const first = solve(session.state.board).sequence[0]!;
  await page.locator(`[data-arrow="${first}"]`).click();
  await expect(page.locator(`[data-arrow="${first}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar y volver al mapa' }).click();
  await expect(page.locator('[data-action="map-play"]')).toContainText('Continuar nivel 1');
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).classicSave as PlaySession,
    SAVE_KEY,
  );
  await page.reload();
  await page.locator('.home-map-button').click();
  await page.locator('[data-action="map-play"]').click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(saved.state.board.arrows.length);
  const resumed = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).classicSave as PlaySession,
    SAVE_KEY,
  );
  expect(resumed.id).toBe(saved.id);
  expect(resumed.powerArrowId).toBe(saved.powerArrowId);
  expect(resumed.state).toEqual(saved.state);
  await expect(page.locator('.power-arrow-note')).not.toHaveAttribute('open');
  await page.locator('.power-arrow-note summary').click();
  await expect(page.locator('.power-arrow-note')).toContainText('si choca, pierde una vida');
  await page.getByRole('button', { name: 'Entendido', exact: true }).click();
  for (const id of solve(resumed.state.board).sequence) {
    const arrow = page.locator(`[data-arrow="${id}"]`);
    if ((await arrow.count()) === 0) continue;
    await expect(arrow).toBeEnabled();
    await arrow.click();
    expect(await page.locator('.combo-spark').count()).toBeLessThanOrEqual(72);
    if (id === resumed.powerArrowId)
      await page.screenshot({ path: '.artifacts/commercial-review/power-explosion.png' });
  }
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('legacy levels remain complete, winning advances map, and effects respect motion preference', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await page.evaluate((key) => {
    const profile = JSON.parse(localStorage.getItem(key)!);
    profile.level = 13;
    localStorage.setItem(key, JSON.stringify(profile));
  }, SAVE_KEY);
  await page.reload();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.home-map-button').click();
  await expect(page.locator('.map-node[data-value="12"]')).toHaveAttribute(
    'aria-label',
    'Nivel 12. Completado',
  );
  await page.locator('.map-node[data-value="12"]').click();
  await expect(page.locator('.map-selection')).toContainText('repetición');
  await expect(page.locator('[data-action="map-play"]')).toHaveCount(0);
  expect(
    await page.locator('.map-selection').evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await page.getByRole('button', { name: 'Ir a mi nivel' }).click();
  await page.locator('[data-action="map-play"]').click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  const session = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).classicSave as PlaySession,
    SAVE_KEY,
  );
  for (const id of solve(session.state.board).sequence) {
    const arrow = page.locator(`[data-arrow="${id}"]`);
    if ((await arrow.count()) === 0) continue;
    await expect(arrow).toBeEnabled();
    await arrow.click();
  }
  await expect(page.getByRole('dialog')).toContainText('CAMINO DESPEJADO');
  await expect(page.locator('.combo-spark')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver mapa', exact: true }).click();
  await expect(page.locator('.map-node[data-value="14"]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.map-selection')).toContainText('Nivel 14');
  await page.screenshot({ path: '.artifacts/commercial-review/map-progress.png' });
});

test('survival arrivals, cadence display and paused state survive reload', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await page.locator('[data-action="endless-play"]').first().click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(10);
  await expect(page.locator('[data-survival-cadence]')).toContainText('Ritmo:');
  await expect(page.locator('[data-arrow]')).toHaveCount(12, { timeout: 8000 });
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).endlessSave as PlaySession,
    SAVE_KEY,
  );
  await page.waitForTimeout(1000);
  const paused = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).endlessSave as PlaySession,
    SAVE_KEY,
  );
  expect(paused.survival).toEqual(saved.survival);
  await page.reload();
  await page.locator('[data-action="endless-play"]').first().click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).toHaveCount(12);
  await page.screenshot({ path: '.artifacts/commercial-review/survival-390.png' });
});

test('save failures stay visible while navigating and Escape closes map selection first', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable for test');
    };
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await expect(page.locator('.save-warning')).toContainText('Cerrar puede perder esta sesión');
  await page.locator('.home-map-button').click();
  await expect(page.locator('.save-warning')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.map-selection')).toContainText('Selecciona un nodo');
  await page.keyboard.press('Escape');
  await expect(page.locator('.hero-play')).toBeVisible();
  await expect(page.locator('.save-warning')).toBeVisible();
});
