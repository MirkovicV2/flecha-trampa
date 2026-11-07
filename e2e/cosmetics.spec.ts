import { expect, test } from '@playwright/test';
import { newSession } from '../src/services/session';
import { configForLevel } from '../src/generator/config';
import { SKINS, RARITIES } from '../src/config/collection';
import { ARROW_DESIGNS } from '../src/config/arrow-designs';
import { defaultProfile, SAVE_KEY } from '../src/services/progress';
import { availableMoves } from '../src/core/board';
import type { Board, Direction } from '../src/core/types';

for (const rarity of RARITIES)
  test(`inspects every ${rarity} design and motion without granting locked items`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Ya sé jugar' }).click();
    await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
    await page.getByRole('button', { name: 'Colección', exact: true }).click();
    const before = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).economy,
      SAVE_KEY,
    );
    await expect(page.locator('[data-collection-skin]')).toHaveCount(SKINS.length);
    for (const skin of SKINS.filter((skin) => skin.rarity === rarity)) {
      await page.getByRole('button', { name: `Inspeccionar ${skin.name}`, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Inspector de skin' });
      await expect(dialog.getByRole('heading', { name: skin.name, exact: true })).toBeVisible();
      await expect(dialog.locator('[data-inspector-stage]')).toHaveAttribute(
        'data-inspector-stage',
        ARROW_DESIGNS[skin.id].exit,
      );
      await expect(dialog.locator('.inspector-directions [data-skin-art]')).toHaveCount(4);
      await dialog.getByRole('button', { name: 'Probar animación', exact: true }).click();
      await expect(dialog.locator('[data-previewing]')).toHaveCount(1);
      await expect(dialog.locator('.inspector-particle')).not.toHaveCount(0);
      await expect(dialog.locator('[data-previewing]')).toHaveCount(0);
      await expect(dialog.locator('.inspector-particle')).toHaveCount(0);
      if (skin.id === 'nova')
        await page.screenshot({
          path: `.artifacts/060-inspector-${rarity}-${info.project.name}.png`,
        });
      await dialog.getByRole('button', { name: 'Cerrar inspector' }).click();
    }
    await page.getByRole('button', { name: /En propiedad/ }).click();
    await expect(page.locator('[data-collection-skin]:visible')).toHaveCount(1);
    await page.getByRole('button', { name: /Legendarias/ }).click();
    await expect(page.locator('[data-collection-skin]:visible')).toHaveCount(
      SKINS.filter((skin) => skin.rarity === 'legendary').length,
    );
    await page.getByRole('button', { name: /Todas/ }).click();
    const after = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).economy,
      SAVE_KEY,
    );
    expect(after.collection).toEqual(before.collection);
    expect(after.energy.amount).toBe(before.energy.amount);
    await page.screenshot({
      path: `.artifacts/060-collection-${rarity}-${info.project.name}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });

test('equipped materials render and animate real moves without changing touch targets', async ({
  page,
}) => {
  test.setTimeout(150000);
  const profile = defaultProfile();
  profile.level = 31;
  profile.classicSave = newSession('classic', 31, 'cosmetic-materials', configForLevel(31));
  profile.tutorialDone = true;
  profile.economy.collection.ownedSkins = SKINS.map((skin) => skin.id);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: SAVE_KEY,
    value: profile,
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  for (const skin of [
    'pixel',
    'prism',
    'orbit',
    'royal',
    'nova',
    'frost',
    'ember',
    'ronin',
    'circuit',
    'petal',
    'tide',
    'phoenix',
    'aurora',
  ] as const) {
    await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
    await page.getByRole('button', { name: 'Colección', exact: true }).click();
    await page.locator(`[data-action="skin"][data-value="${skin}"]`).click();
    await page.getByRole('button', { name: 'Inicio', exact: true }).click();
    await page.locator('[data-action="play"]').click();
    await expect(page.locator('.board-loading')).toHaveCount(0);
    const buttons = page.locator('[data-arrow]');
    const arrows = await buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const data = (element as HTMLElement).dataset;
        return {
          id: data.arrow!,
          x: Number(data.x),
          y: Number(data.y),
          direction: data.direction as Direction,
        };
      }),
    );
    const board: Board = { width: 8, height: 8, arrows };
    const moving = availableMoves(board)[0]!;
    const stationary = arrows.find((arrow) => arrow.id !== moving.id)!;
    const target = page.locator(`[data-arrow="${stationary.id}"]`);
    const before = await target.boundingBox();
    await page.locator(`[data-arrow="${moving.id}"]`).click();
    await expect(buttons).toHaveCount(arrows.length - 1);
    expect(await target.boundingBox()).toEqual(before);
    await expect(page.locator('[data-lives]')).toHaveAttribute('aria-label', '3 vidas');
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  }
  expect(errors).toEqual([]);
});
