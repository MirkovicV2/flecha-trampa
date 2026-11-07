import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { defaultProfile, SAVE_KEY } from '../src/services/progress';
import type { PlayerProfile } from '../src/services/progress';
import { solve } from '../src/solver/solver';

const saved = (page: Page): Promise<PlayerProfile> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);

async function collection(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Recompensas', exact: true }).click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
}

test('earns a key through play, debits both resources and blocks a stocked chest after reload', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.economy.collection.chests = 3;
  profile.economy.collection.keys = 0;
  profile.economy.collection.keyProgress = 4;
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
    },
    { key: SAVE_KEY, value: profile },
  );
  await page.goto('/');
  await collection(page);
  await expect(page.locator('[data-key-count]')).toHaveText('0');
  await expect(page.locator('[data-key-progress]')).toHaveText('4 / 5');
  await expect(page.getByRole('button', { name: 'Abrir cofre', exact: true })).toBeDisabled();
  await expect(page.locator('#chest-opening-cost')).toContainText('1 cofre y 1 llave');
  await expect(page.locator('.chest-vault')).toContainText('15 niveles');
  await page.getByRole('button', { name: 'Jugar y forjar' }).click();
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(page.locator('[data-arrow]')).not.toHaveCount(0);
  const board = (await saved(page)).classicSave!.state.board;
  for (const id of solve(board).sequence) {
    const arrow = page.locator(`[data-arrow="${id}"]`);
    if (info.project.name === 'mobile') await arrow.tap();
    else await arrow.click();
  }
  await expect(page.getByRole('dialog')).toContainText('+1 llave');
  let profileAfter = await saved(page);
  expect(profileAfter.economy.collection).toMatchObject({ chests: 3, keys: 1, keyProgress: 0 });
  expect(profileAfter.economy.energy.amount).toBe(4);
  await page.screenshot({ path: `.artifacts/070-forge-result-${info.project.name}.png` });
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await collection(page);
  await expect(page.locator('[data-key-count]')).toHaveText('1');
  await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
  profileAfter = await saved(page);
  expect(profileAfter.economy.collection).toMatchObject({ chests: 2, keys: 0, opened: 1 });
  expect(profileAfter.economy.energy.amount).toBe(4);
  await page.reload();
  await collection(page);
  await expect(page.getByRole('button', { name: 'Abrir cofre', exact: true })).toBeDisabled();
  await expect(page.locator('[data-key-count]')).toHaveText('0');
  await expect(page.locator('[data-key-progress]')).toHaveText('0 / 5');
  await page.setViewportSize({ width: 320, height: 760 });
  await page
    .locator('.chest-vault')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: `.artifacts/070-locked-vault-${info.project.name}.png` });
  await page
    .locator('.key-forge')
    .evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: `.artifacts/070-forge-narrow-${info.project.name}.png` });
  expect((await saved(page)).economy.collection).toEqual(profileAfter.economy.collection);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('preserves old chest stock and claims while applying the new one-chest pass rewards', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const profile = defaultProfile();
  profile.tutorialDone = true;
  profile.economy.collection.chests = 8;
  profile.economy.collection.opened = 12;
  profile.economy.collection.sinceEpic = 7;
  profile.economy.pass.xp = 4000;
  profile.economy.pass.claimed = ['free:5'];
  const legacy = JSON.stringify(profile, (key, value: unknown) =>
    key === 'keys' || key === 'keyProgress' ? undefined : value,
  );
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: legacy },
  );
  await page.goto('/');
  await collection(page);
  await expect(page.locator('[data-key-count]')).toHaveText('1');
  expect((await saved(page)).economy.collection).toMatchObject({
    chests: 8,
    opened: 12,
    sinceEpic: 7,
  });
  await page.getByRole('button', { name: 'Pase de temporada', exact: true }).click();
  await expect(page.locator('[data-value="free:5"]')).toBeDisabled();
  await expect(page.locator('[data-pass-tier="9"] .free')).toContainText('1 cofre');
  await page.locator('[data-action="claim-reward"][data-value="free:9"]').click();
  await page.getByRole('button', { name: 'Colección', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir cofre', exact: true }).click();
  await expect(page.locator('[data-case-phase]')).toHaveAttribute('data-case-phase', 'revealed');
  await page.reload();
  await collection(page);
  await expect(page.locator('[data-key-count]')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Abrir cofre', exact: true })).toBeDisabled();
  expect((await saved(page)).economy.collection).toMatchObject({ chests: 8, opened: 13 });
});
