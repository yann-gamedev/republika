import { writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { answerMemos, endQuarter, shortcut } from './helpers';

const PRESIDENT = 'Raka Pradipta';
/** Build E2E (`vite build --mode e2e`) memakai kampanye 20 kuartal. */
const MAX_TURNS = 20;

test('kampanye penuh sampai Laporan Akhir Masa Jabatan', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByLabel(copy.inauguration.presidentLabel).fill(PRESIDENT);
  await page.getByLabel(copy.inauguration.cabinetLabel).fill('Kabinet Fajar');
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await page.getByRole('button', { name: copy.inauguration.ceremonyEnter }).click();
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
  await expect(page.getByRole('img', { name: copy.game.quarterTrack(1, MAX_TURNS) })).toBeVisible();

  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    if (turn > 1) await shortcut(page, '1', copy.dashboard.title);
    if (await page.getByRole('link', { name: /nota dinas dulu$/ }).isVisible()) {
      // Pilih opsi terakhir (biasanya netral) agar kampanye tetap stabil.
      await answerMemos(page, 'last');
    }
    // Sesekali ajukan kebijakan yang tersedia agar ledger berisi keputusan.
    if (turn % 3 === 1) {
      await shortcut(page, '2', copy.policies.title);
      const enact = page.getByRole('button', { name: copy.policies.enact, exact: true });
      if ((await enact.count()) > 0 && (await enact.first().isEnabled()))
        await enact.first().click();
    }
    await endQuarter(page);
    const expected =
      turn < MAX_TURNS
        ? copy.report.reportTitle(PRESIDENT, turn)
        : copy.final.title(PRESIDENT, 'Kabinet Fajar', 2031, 2035);
    await expect(page.getByRole('heading', { name: expected })).toBeVisible();
  }

  await expect(page.getByTestId('final-archetype')).toBeVisible();
  await expect(page.getByTestId('final-decisions')).toBeVisible();
  await expect(
    page.getByRole('region', { name: copy.final.chartsTitle }).locator('svg[role="img"]'),
  ).toHaveCount(8);
  await page.screenshot({ path: 'test-results/final-1440.png', fullPage: true });

  // Semua command terkunci setelah kampanye selesai.
  await shortcut(page, '2', copy.policies.title);
  await expect(page.getByText(copy.commandErrors.CAMPAIGN_COMPLETED).first()).toBeVisible();

  const heap = await page.evaluate(() => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return memory?.usedJSHeapSize ?? null;
  });
  await writeFile(
    'test-results/final-metrics.json',
    `${JSON.stringify({ quarters: MAX_TURNS, jsHeapBytes: heap }, null, 2)}\n`,
  );
  expect(errors).toEqual([]);
});
