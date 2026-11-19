import { expect, test } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { completeDossier, endQuarter, shortcut, signOath } from './helpers';

test('reshuffle: pilih calon, antre 1 AP, dilantik saat kuartal diakhiri', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByLabel(copy.inauguration.presidentLabel).fill('Laras Pertiwi');
  await completeDossier(page);
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await signOath(page);
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();

  await shortcut(page, '4', copy.cabinet.title);
  const office = page.getByTestId('office-LDR-JAKSA');
  const before = await office.locator('.font-serif').first().textContent();
  await office.getByRole('button', { name: copy.cabinet.reshuffle }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const candidate = dialog.locator('article[data-testid^="candidate-"]').first();
  const name = (await candidate.locator('.font-serif').first().textContent()) ?? '';
  await candidate.getByRole('button', { name: copy.cabinet.appoint }).click();
  await expect(dialog).toHaveCount(0);
  await expect(office).toContainText(copy.cabinet.queuedFor(name));
  await expect(page.getByRole('img', { name: copy.game.apTokens(1, 2) }).first()).toBeVisible();
  // Kuota habis: tombol reshuffle jabatan lain nonaktif.
  await expect(
    page.getByTestId('office-LDR-KSP').getByRole('button', { name: copy.cabinet.reshuffle }),
  ).toBeDisabled();

  await shortcut(page, '1', copy.dashboard.title);
  await expect(page.getByTestId('command-queue')).toContainText(copy.dashboard.reshuffleKicker);
  await endQuarter(page);
  await shortcut(page, '4', copy.cabinet.title);
  await expect(office).toContainText(name);
  expect(name).not.toBe(before);
  await office.getByRole('button', { name: copy.cabinet.profile }).click();
  await expect(page.getByRole('dialog')).toContainText(copy.cabinet.recordTitle);
  await expect(page.getByRole('dialog')).toContainText(name);
  expect(errors).toEqual([]);
});
