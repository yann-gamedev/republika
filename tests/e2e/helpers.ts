import { expect, type Page } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

/** Pintasan angka lalu tunggu judul halaman tujuan (rute dimuat lazy). */
export async function shortcut(page: Page, key: string, title: string): Promise<void> {
  await page.keyboard.press(key);
  await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
}

/**
 * Jawab semua nota dinas: pilih opsi (radio), tandatangani, lalu pastikan
 * stempel tampil. Mengembalikan jumlah nota yang dijawab.
 */
export async function answerMemos(page: Page, pick: 'first' | 'last' = 'first'): Promise<number> {
  await shortcut(page, '5', copy.events.title);
  const memos = page.locator('article[data-testid^="event-"]');
  const count = await memos.count();
  for (let index = 0; index < count; index += 1) {
    const memo = memos.nth(index);
    const signButton = memo.getByRole('button', { name: copy.events.sign });
    if (!(await signButton.isVisible())) continue;
    const radios = memo.getByRole('radio');
    await (pick === 'first' ? radios.first() : radios.last()).click();
    await signButton.click();
    await expect(memo.getByTestId('stamp')).toHaveAttribute('data-visible', 'true');
  }
  // Nota dinas adalah mode fokus tanpa bilah atas; kembali ke Meja kerja.
  await shortcut(page, '1', copy.dashboard.title);
  return count;
}

const AFTER_QUARTER = /#\/game\/(session|report|final)$/;

/** Lewati layar sidang paripurna (bila ada) sampai warta atau laporan akhir. */
export async function throughSession(page: Page): Promise<void> {
  await page.waitForURL(AFTER_QUARTER);
  const proceed = page.getByRole('button', {
    name: new RegExp(`^(${copy.session.next}|${copy.session.toReport}|${copy.session.toFinal})$`),
  });
  while (page.url().endsWith('#/game/session')) {
    const skip = page.getByRole('button', { name: copy.session.skip });
    await expect(skip.or(proceed)).toBeVisible();
    if (await skip.isVisible()) await skip.click();
    await proceed.click();
    await page.waitForURL(AFTER_QUARTER);
  }
}

/** Tombol "Akhiri kuartal" → konfirmasi Enter → (sidang) → warta. */
export async function endQuarter(page: Page): Promise<void> {
  await page.getByRole('button', { name: copy.game.endQuarter }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Enter');
  await throughSession(page);
}

/**
 * Langkah 2 pelantikan: tandatangani naskah sumpah, pastikan stempel DILANTIK
 * tampil, lalu masuk ke Meja kerja.
 */
export async function signOath(page: Page): Promise<void> {
  await page.getByRole('button', { name: copy.inauguration.signSumpah }).click();
  await expect(page.getByTestId('stamp')).toHaveAttribute('data-visible', 'true');
  await page.getByRole('button', { name: copy.inauguration.ceremonyEnter }).click();
}

/** Berkas pencalonan 6B.2: pilih latar belakang pertama dan tiga janji pertama. */
export async function completeDossier(page: Page): Promise<void> {
  await page
    .getByRole('radiogroup', { name: copy.inauguration.stepBackground })
    .getByRole('radio')
    .first()
    .click();
  const promises = page.getByRole('checkbox');
  for (let index = 0; index < 3; index += 1) await promises.nth(index).click();
}
