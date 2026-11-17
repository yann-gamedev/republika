import { expect, test } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

test('pelantikan, navigasi, aksi mock, dan pengaturan', async ({ page }) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
      externalRequests.push(request.url());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: copy.menu.title, exact: true })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await expect(page.getByRole('alert')).toHaveText(copy.inauguration.errorRequired);
  await page.getByLabel(copy.inauguration.presidentLabel).fill('Presiden Uji');
  await page.getByLabel(copy.inauguration.cabinetLabel).fill('Kabinet Uji');
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
  await expect(page.getByText('Presiden Uji', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.game.endQuarter })).toBeDisabled();

  for (const key of ['policies', 'parliament', 'cabinet', 'events', 'history'] as const) {
    await page.locator(`nav a[href="#/game/${key}"]`).click();
    await expect(
      page.getByRole('heading', { name: copy[key].title, exact: true }).first(),
    ).toBeVisible();
    if (key === 'policies') {
      await page.getByRole('button', { name: copy.policies.enact, exact: true }).click();
      await expect(page.getByRole('status')).toContainText(copy.policies.enactMock);
    }
    if (key === 'events') {
      await page.getByRole('button', { name: copy.events.choose }).first().click();
      await expect(page.getByRole('button', { name: copy.events.selected })).toBeDisabled();
      await expect(page.getByRole('button', { name: copy.game.endQuarter })).toBeDisabled();
    }
  }
  await page.getByRole('link', { name: copy.nav.settings, exact: true }).click();
  await page.getByRole('button', { name: /125%/ }).click();
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('semua layar muat pada jendela minimum', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const route of [
    '',
    'inauguration',
    'settings',
    ...['dashboard', 'policies', 'parliament', 'cabinet', 'events', 'history'].map(
      (name) => `game/${name}`,
    ),
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/history-1280.png', fullPage: true });
  await page.goto('/#/game/dashboard');
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-1280.png', fullPage: true });
  for (const scale of [90, 110, 125]) {
    await page.goto('/#/settings');
    await page.getByRole('button', { name: new RegExp(`${scale}%`) }).click();
    for (const route of ['', 'game/dashboard', 'game/policies', 'game/history']) {
      await page.goto(`/#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
});
