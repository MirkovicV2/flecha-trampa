import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

function contrast(a: string, b: string): number {
  const luminance = (color: string) => {
    const channels = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const linear = value / 255;
        return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
      });
    return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('hint retains readable contrast while loading, hovered, keyboard focused and touched', async ({
  page,
}, info) => {
  let releaseBoard!: () => void;
  const boardGate = new Promise<void>((resolve) => {
    releaseBoard = resolve;
  });
  // A delayed real module request lets the normal loading flow disable the control.
  await page.route(
    /\/(?:assets\/BoardScene-[^/]+\.js|src\/scenes\/BoardScene\.ts)(?:\?.*)?$/,
    async (route) => {
      await boardGate;
      await route.continue();
    },
  );
  const hint = page.getByRole('button', { name: 'Una pista' });
  const states: Record<string, unknown> = {};
  const record = async (name: string, background: string) => {
    await expect(hint).toHaveCSS('background-color', background);
    const state = await hint.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        opacity: style.opacity,
        focusVisible: element.matches(':focus-visible'),
        hovered: element.matches(':hover'),
        disabled: (element as HTMLButtonElement).disabled,
        outline: style.outline,
        fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
      };
    });
    const ratio = contrast(state.background, state.color);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(state.opacity).toBe('1');
    states[name] = { ...state, contrast: ratio };
    await page.screenshot({
      path: `.artifacts/redesign/hint-${name}-${info.project.name}.png`,
      scale: 'css',
    });
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Ya sé jugar' }).click();
  try {
    await page.getByRole('button', { name: /Jugar ahora/ }).click();
    await expect(page.locator('.board-loading')).toBeVisible();
    await page.getByRole('button', { name: /^Energía:/ }).click();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(hint).toBeDisabled();
    await record('disabled', 'rgb(202, 214, 176)');
    await hint.hover();
    await record('disabled-hover', 'rgb(202, 214, 176)');
    await expect(page.locator('[data-hints]')).toHaveText('3');
  } finally {
    releaseBoard();
  }
  await expect(page.locator('.board-loading')).toHaveCount(0);
  await expect(hint).toBeEnabled();
  await page.mouse.move(0, 0);
  await record('normal', 'rgb(229, 255, 154)');
  await hint.hover();
  const fineHover = await page.evaluate(
    () => matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  await record('hover', fineHover ? 'rgb(237, 255, 186)' : 'rgb(229, 255, 154)');
  await hint.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(hint).toBeFocused();
  await expect(hint).toHaveCSS('outline-style', 'solid');
  await record('focus', 'rgb(237, 255, 186)');
  expect(await hint.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  if (info.project.name === 'mobile') {
    await hint.tap();
    await expect(page.locator('[data-hints]')).toHaveText('2');
    // Chromium may preserve :focus-visible when tapping the keyboard-focused control.
    await record('touch-after-keyboard', 'rgb(237, 255, 186)');
    await page.getByRole('heading', { name: 'Abre camino.', exact: true }).tap();
    await hint.tap();
    await expect(page.locator('[data-hints]')).toHaveText('1');
    await record('after-touch', 'rgb(229, 255, 154)');
    expect(await hint.evaluate((element) => element.matches(':hover'))).toBe(true);
  }
  mkdirSync('.artifacts/redesign', { recursive: true });
  writeFileSync(
    `.artifacts/redesign/hint-states-${info.project.name}.json`,
    JSON.stringify(states, null, 2),
  );
});
