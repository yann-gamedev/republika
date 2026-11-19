import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { completeDossier, endQuarter, signOath } from './helpers';

async function audit(page: Page, label: string): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${label}: ${violation.id} (${violation.impact}) × ${violation.nodes.length} — ${violation.nodes
          .slice(0, 2)
          .map((node) => node.target.join(' '))
          .join(' | ')}`,
    );
}

async function gotoHash(page: Page, route: string, heading: string): Promise<void> {
  await page.evaluate((target) => {
    window.location.hash = target;
  }, `#/${route}`);
  await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
}

test('aksesibilitas: tanpa pelanggaran axe serius/kritis di semua halaman', async ({ page }) => {
  test.setTimeout(120_000);
  const violations: string[] = [];
  // Audit pada mode gerak minimal: animasi masuk tidak mengganggu pengukuran kontras.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: copy.menu.title, exact: true })).toBeVisible();
  violations.push(...(await audit(page, 'menu')));

  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await expect(page.getByRole('heading', { name: copy.inauguration.title })).toBeVisible();
  violations.push(...(await audit(page, 'pelantikan')));
  await page.getByLabel(copy.inauguration.presidentLabel).fill('Sari Wening');
  await completeDossier(page);
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await expect(page.getByRole('button', { name: copy.inauguration.signSumpah })).toBeVisible();
  violations.push(...(await audit(page, 'sumpah')));
  await signOath(page);
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
  await page.getByRole('button', { name: copy.common.close }).click();

  const pages: Array<[string, string]> = [
    ['game/dashboard', copy.dashboard.title],
    ['game/policies', copy.policies.title],
    ['game/parliament', copy.parliament.title],
    ['game/cabinet', copy.cabinet.title],
    ['game/events', copy.events.title],
    ['game/map', copy.map.title],
    ['game/history', copy.history.title],
    ['settings', copy.settings.title],
  ];
  for (const [route, heading] of pages) {
    await gotoHash(page, route, heading);
    violations.push(...(await audit(page, route)));
  }

  // Daftar pintasan lewat "?".
  await gotoHash(page, 'game/dashboard', copy.dashboard.title);
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: copy.shortcuts.title })).toBeVisible();
  violations.push(...(await audit(page, 'pintasan')));
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Satu kuartal agar laporan dan riwayat berisi data.
  await gotoHash(page, 'game/dashboard', copy.dashboard.title);
  await endQuarter(page);
  await expect(
    page.getByRole('heading', { name: copy.report.reportTitle('Sari Wening', 1) }),
  ).toBeVisible();
  violations.push(...(await audit(page, 'laporan')));
  await gotoHash(page, 'game/history', copy.history.title);
  violations.push(...(await audit(page, 'riwayat-berisi')));
  await gotoHash(page, 'game/events', copy.events.title);
  violations.push(...(await audit(page, 'peristiwa-berisi')));

  expect(violations).toEqual([]);
});
