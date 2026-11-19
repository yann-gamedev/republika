import { writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { answerMemos, completeDossier, endQuarter, shortcut, signOath } from './helpers';

const PRESIDENT = 'Sari Wening';

async function endQuarterTo(page: Page, turn: number): Promise<void> {
  await endQuarter(page);
  await expect(
    page.getByRole('heading', { name: copy.report.reportTitle(PRESIDENT, turn) }),
  ).toBeVisible();
}

test('vertical slice: 4 kuartal dari pelantikan sampai riwayat', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByLabel(copy.inauguration.presidentLabel).fill(PRESIDENT);
  await completeDossier(page);
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await signOath(page);
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();

  // Kuartal 1: ajukan kebijakan + lobi fraksi.
  await shortcut(page, '2', copy.policies.title);
  await page
    .getByRole('button', { name: copy.policies.enactAp(1), exact: true })
    .first()
    .click();
  await expect(page.getByRole('status')).toContainText('diajukan');
  await shortcut(page, '3', copy.parliament.title);
  await page.getByRole('button', { name: copy.parliament.lobby }).first().click();
  await expect(page.getByRole('status')).toContainText('dilobi');
  await expect(page.getByTestId('vote-preview')).toBeVisible();
  // AP habis: tombol lobi lain nonaktif dengan alasan dari engine.
  await expect(page.getByRole('button', { name: copy.parliament.lobby }).first()).toBeDisabled();

  await endQuarterTo(page, 1);
  await expect(page.getByTestId('report-1')).toContainText(copy.report.causes);
  await page.screenshot({ path: 'test-results/report-1440.png', fullPage: true });

  let answered = 0;
  for (let turn = 2; turn <= 4; turn += 1) {
    await shortcut(page, '1', copy.dashboard.title);
    const blockedLink = page.getByRole('link', { name: /nota dinas dulu$/ });
    if (await blockedLink.isVisible()) {
      await expect(page.getByRole('button', { name: copy.game.endQuarter })).toBeDisabled();
      answered += await answerMemos(page);
      await expect(page.getByRole('button', { name: copy.game.endQuarter })).toBeEnabled();
    }
    await endQuarterTo(page, turn);
  }

  // Riwayat dimuat dari save: 4 laporan + grafik SVG.
  await shortcut(page, '7', copy.history.title);
  await expect(page.getByText(copy.history.reportCount(4))).toBeVisible();
  await expect(page.locator('svg[role="img"]').first()).toBeVisible();

  const heap = await page.evaluate(() => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return memory?.usedJSHeapSize ?? null;
  });
  test.info().annotations.push({ type: 'js-heap-bytes', description: String(heap) });
  await writeFile(
    'test-results/slice-metrics.json',
    `${JSON.stringify({ jsHeapBytes: heap, eventsAnswered: answered }, null, 2)}\n`,
  );
  expect(errors).toEqual([]);
});
