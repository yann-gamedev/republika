import { expect, test } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { signOath } from './helpers';

test('simpan ke slot, ganti nama, muat, dan hapus lewat layar Simpan & Muat', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByLabel(copy.inauguration.presidentLabel).fill('Sari Wening');
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await signOath(page);
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();

  await page.getByRole('link', { name: copy.saves.nav }).click();
  await expect(page.getByRole('heading', { name: copy.saves.title })).toBeVisible();
  const slot1 = page.getByTestId('save-slot-1');
  await slot1.getByRole('button', { name: copy.saves.save }).click();
  await expect(slot1).toContainText('Presiden Sari Wening — Kuartal 1');

  // Menimpa slot meminta konfirmasi.
  await slot1.getByRole('button', { name: copy.saves.save }).click();
  await expect(page.getByRole('dialog', { name: copy.saves.confirmOverwriteTitle })).toBeVisible();
  await page.keyboard.press('Escape');

  await slot1.getByRole('button', { name: copy.saves.rename }).click();
  await slot1.getByLabel(copy.saves.labelField('Slot 1')).fill('Awal masa jabatan');
  await slot1.getByRole('button', { name: copy.saves.renameSave }).click();
  await expect(slot1).toContainText('Awal masa jabatan');

  await slot1.getByRole('button', { name: copy.saves.load }).click();
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();

  await page.getByRole('link', { name: copy.saves.nav }).click();
  await slot1.getByRole('button', { name: copy.saves.delete }).click();
  await page.getByRole('dialog').getByRole('button', { name: copy.saves.delete }).click();
  await expect(slot1).toContainText(copy.saves.empty);
  expect(errors).toEqual([]);
});
