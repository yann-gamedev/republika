import { expect, test } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { completeDossier, endQuarter, shortcut, signOath } from './helpers';

test('peta daerah: 38 tile, kunjungan diantrekan, kepuasan naik setelah kuartal', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByLabel(copy.inauguration.presidentLabel).fill('Laras Pertiwi');
  await completeDossier(page);
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await signOath(page);
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();

  await shortcut(page, '7', copy.map.title);
  await expect(page.locator('button[data-testid^="tile-"]')).toHaveCount(38);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const tile = page.getByTestId('tile-PRV-PAPPEG');
  await tile.click();
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByTestId('province-panel');
  await expect(panel).toContainText('Papua Pegunungan');
  const before = Number.parseFloat(
    ((await tile.getByTestId('tile-label').textContent()) ?? '')
      .match(/kepuasan ([\d,]+)/)?.[1]
      ?.replace(',', '.') ?? 'NaN',
  );

  await panel.getByRole('button', { name: new RegExp(`^${copy.map.actions.VISIT}`) }).click();
  await expect(panel).toContainText(copy.map.queuedNote);
  await expect(page.getByRole('img', { name: copy.game.apTokens(1, 2) }).first()).toBeVisible();
  // Filter legenda meredupkan tingkat lain tanpa menyembunyikan angka.
  await page.getByRole('button', { name: copy.map.levels[1] }).click();
  await expect(page.getByRole('button', { name: copy.map.levels[1] })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await shortcut(page, '1', copy.dashboard.title);
  await expect(page.getByTestId('command-queue')).toContainText(copy.dashboard.provinceKicker);
  await endQuarter(page);
  await shortcut(page, '7', copy.map.title);
  const after = Number.parseFloat(
    ((await page.getByTestId('tile-PRV-PAPPEG').getByTestId('tile-label').textContent()) ?? '')
      .match(/kepuasan ([\d,]+)/)?.[1]
      ?.replace(',', '.') ?? 'NaN',
  );
  expect(after).toBeGreaterThan(before);
  expect(errors).toEqual([]);
});
