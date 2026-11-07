import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { SKINS } from '../src/config/collection';
import { defaultProfile, SAVE_KEY } from '../src/services/progress';
import type { PlayerProfile } from '../src/services/progress';

async function collection(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
}
async function start(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  await collection(page);
}
async function saved(page: Page): Promise<PlayerProfile> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}

test('spins, brakes on the committed award and equips it after a single chest debit', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  const energy = (await saved(page)).economy.energy.amount;
  await page.locator('[data-action="open-chest"]').evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'rolling');
  await expect(page.getByRole('button', { name: 'Equipar skin', exact: true })).toBeHidden();
  const committed = await saved(page);
  expect(committed.economy.collection.chests).toBe(0);
  expect(committed.economy.collection.opened).toBe(1);
  const awarded = committed.economy.collection.ownedSkins.find((id) => id !== 'classic')!;
  expect(awarded).toBeTruthy();
  await expect(page.locator('[data-reel-winner] [data-skin-art]')).toHaveAttribute(
    'data-skin-art',
    awarded,
  );
  await page.getByRole('button', { name: 'Sonido de apertura' }).click();
  await expect(page.getByRole('button', { name: 'Sonido de apertura' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: `.artifacts/040-reel-${info.project.name}.png` });
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
  const name = SKINS.find((skin) => skin.id === awarded)!.name;
  await expect(page.getByRole('dialog').getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('[data-case-live]')).toContainText(name);
  expect((await saved(page)).economy.collection).toEqual(committed.economy.collection);
  await page.screenshot({ path: `.artifacts/040-drop-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Equipar skin', exact: true }).click();
  await expect(page.locator('.skin-card.selected')).toHaveAttribute(
    'data-collection-skin',
    awarded,
  );
  expect((await saved(page)).economy.energy.amount).toBe(energy);
  expect(errors).toEqual([]);
});

test('skip, Escape and resize reveal the same duplicate without extra rewards', async ({
  page,
}) => {
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.economy.collection.ownedSkins = SKINS.map((skin) => skin.id);
  profile.economy.collection.chests = 3;
  profile.economy.collection.keys = 3;
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
    },
    { key: SAVE_KEY, value: profile },
  );
  await page.goto('/');
  await collection(page);
  for (const way of ['skip', 'escape', 'resize']) {
    await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
    const committed = (await saved(page)).economy.collection;
    if (way === 'skip')
      await page.getByRole('button', { name: 'Saltar animación', exact: true }).click();
    else if (way === 'escape') await page.keyboard.press('Escape');
    else {
      await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'rolling');
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
    }
    await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
    await expect(page.locator('.duplicate-reward')).toBeVisible();
    expect(committed.shards).toBeGreaterThan(0);
    expect((await saved(page)).economy.collection).toEqual(committed);
    expect(
      await page.locator('.case-reel-track').evaluate((element) => element.getAnimations().length),
    ).toBe(0);
    await page.getByRole('button', { name: 'Volver a la colección', exact: true }).click();
  }
  expect((await saved(page)).economy.collection.opened).toBe(3);
  await expect(page.getByRole('button', { name: 'Abrir cofre', exact: true })).toBeDisabled();
  expect((await saved(page)).economy.energy.amount).toBe(5);
});

test('closing during a spin preserves the awarded skin across reload', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'rolling');
  const before = (await saved(page)).economy.collection;
  await page.reload();
  await collection(page);
  expect((await saved(page)).economy.collection).toEqual(before);
  await expect(page.getByRole('button', { name: 'Abrir cofre', exact: true })).toBeDisabled();
  await expect(page.locator('[data-collection-skin][data-owned="true"]')).toHaveCount(2);
});

test('system reduced motion skips the reel and keeps the award available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
  await expect(page.locator('.case-reel-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Equipar skin', exact: true }).click();
  expect((await saved(page)).settings.skin).not.toBe('classic');
  expect((await saved(page)).economy.collection.opened).toBe(1);
});
