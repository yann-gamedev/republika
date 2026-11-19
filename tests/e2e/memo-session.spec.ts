import { expect, test } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { completeDossier, shortcut, signOath, throughSession } from './helpers';

const PRESIDENT = 'Laras Pertiwi';

test('nota dinas → stempel → akhiri kuartal → sidang paripurna → warta', async ({ page }) => {
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

  // Kuartal 1 tanpa keputusan: nota pertama tiba di kuartal 2.
  await page.getByRole('button', { name: copy.game.endQuarter }).click();
  await page.keyboard.press('Enter');
  await throughSession(page);
  await shortcut(page, '1', copy.dashboard.title);

  // Nota dinas: tombol tanda tangan aktif setelah memilih, lalu stempel tampil.
  await shortcut(page, '5', copy.events.title);
  const memo = page.locator('article[data-testid^="event-"]').first();
  await expect(memo).toBeVisible();
  const sign = memo.getByRole('button', { name: copy.events.sign });
  await expect(sign).toBeDisabled();
  await expect(memo.getByTestId('stamp')).toHaveAttribute('data-visible', 'false');
  await memo.getByRole('radio').first().click();
  await expect(memo.getByRole('radio').first()).toHaveAttribute('aria-checked', 'true');
  await sign.click();
  await expect(memo.getByTestId('stamp')).toHaveAttribute('data-visible', 'true');
  await expect(memo.getByRole('button', { name: copy.events.changeDecision })).toBeVisible();

  // Ajukan kebijakan yang butuh voting, lalu akhiri kuartal.
  await shortcut(page, '2', copy.policies.title);
  await page
    .getByRole('button', { name: copy.policies.enactAp(1), exact: true })
    .first()
    .click();
  await expect(page.getByRole('status')).toContainText('diajukan');
  await page.getByRole('button', { name: copy.game.endQuarter }).click();
  await page.keyboard.press('Enter');

  // Sidang paripurna: kursi diumumkan per fraksi, total 100.
  await page.waitForURL(/#\/game\/session$/);
  const session = page.getByTestId('session');
  await expect(session).toBeVisible();
  await expect(session.locator('[data-testid^="session-faction-"]')).toHaveCount(6);
  await expect(session.locator('circle[data-status]')).toHaveCount(100);
  await expect(session.getByRole('status')).toContainText(/Disahkan|Ditolak/);
  await expect(session.locator('circle[data-status="pending"]')).toHaveCount(0);
  await page.getByRole('button', { name: copy.session.toReport }).click();

  await expect(
    page.getByRole('heading', { name: copy.report.reportTitle(PRESIDENT, 2) }),
  ).toBeVisible();
  await expect(page.getByTestId('report-2')).toContainText(copy.report.masthead);
  expect(errors).toEqual([]);
});
