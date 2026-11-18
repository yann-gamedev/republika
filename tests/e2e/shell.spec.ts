import { expect, test, type Page } from '@playwright/test';

import { copy } from '../../apps/desktop/src/copy/id';

import { signOath } from './helpers';

/** Pindah rute tanpa reload, agar state di MemoryStorage (dev:web) tetap ada. */
async function gotoHash(page: Page, route: string): Promise<void> {
  await page.evaluate((target) => {
    window.location.hash = target;
  }, `#/${route}`);
}

async function inaugurate(page: Page, name = 'Presiden Uji'): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(copy.menu.newGame) }).click();
  await page.getByLabel(copy.inauguration.presidentLabel).fill(name);
  await page.getByLabel(copy.inauguration.cabinetLabel).fill('Kabinet Uji');
  await page.getByRole('button', { name: copy.inauguration.submit }).click();
  await signOath(page);
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
}

test('pelantikan, aksi nyata, navigasi, dan pengaturan', async ({ page }) => {
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
  await inaugurate(page);
  await expect(page.getByText('Presiden Uji', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.game.endQuarter })).toBeEnabled();

  await page.locator('nav a[href="#/game/policies"]').click();
  await page
    .getByRole('button', { name: copy.policies.enactAp(1), exact: true })
    .first()
    .click();
  await expect(page.getByRole('status')).toContainText('diajukan');
  await expect(page.getByRole('button', { name: copy.policies.cancelPending })).toBeVisible();

  // Nota dinas terakhir: layar mode fokus tanpa sidebar.
  for (const key of ['parliament', 'cabinet', 'history', 'events'] as const) {
    await page.locator(`nav a[href="#/game/${key}"]`).click();
    await expect(
      page.getByRole('heading', { name: copy[key].title, exact: true }).first(),
    ).toBeVisible();
  }

  // Pintasan angka: 1 = Dashboard.
  await page.keyboard.press('1');
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
  await expect(page.getByTestId('command-queue')).not.toContainText(copy.dashboard.queueEmpty);

  await page.getByRole('link', { name: copy.nav.settings, exact: true }).click();
  await page.getByRole('button', { name: /125%/ }).click();
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('rute permainan tanpa kampanye kembali ke menu', async ({ page }) => {
  await page.goto('/#/game/dashboard');
  await expect(page.getByRole('heading', { name: copy.menu.title, exact: true })).toBeVisible();
});

test('semua layar muat pada jendela minimum', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const route of ['', 'inauguration', 'settings']) {
    await page.goto(`/#/${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await inaugurate(page);
  const gameRoutes = ['dashboard', 'policies', 'parliament', 'cabinet', 'events', 'history'].map(
    (name) => `game/${name}`,
  );
  for (const route of gameRoutes) {
    await gotoHash(page, route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await gotoHash(page, 'game/dashboard');
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-1280.png', fullPage: true });
  await gotoHash(page, 'game/policies');
  await expect(page.getByRole('heading', { name: copy.policies.title, exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/policies-1280.png', fullPage: true });
  for (const scale of [90, 110, 125]) {
    await gotoHash(page, 'settings');
    await page.getByRole('button', { name: new RegExp(`${scale}%`) }).click();
    for (const route of ['game/dashboard', 'game/policies', 'game/parliament']) {
      await gotoHash(page, route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
});

test('error di satu layar tidak membuat aplikasi crash', async ({ page }) => {
  await inaugurate(page, 'Presiden Tangguh');
  await gotoHash(page, 'game/__crash');
  await expect(page.getByRole('heading', { name: copy.errors.screenTitle })).toBeVisible();
  // Sidebar tetap hidup; navigasi ke layar lain memulihkan tampilan.
  await page.locator('nav a[href="#/game/policies"]').click();
  await expect(page.getByRole('heading', { name: copy.policies.title, exact: true })).toBeVisible();
  await gotoHash(page, 'game/__crash');
  await page.getByRole('link', { name: copy.errors.backToMenu }).click();
  await expect(page.getByRole('heading', { name: copy.menu.title, exact: true })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(copy.menu.continueGame) }).click();
  await expect(page.getByRole('heading', { name: copy.dashboard.title })).toBeVisible();
});

test('Kembalikan default memulihkan skala 100%', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /125%/ }).click();
  await expect(page.locator('html')).toHaveCSS('font-size', '20px');
  await page.getByRole('button', { name: copy.settings.resetDefaults }).click();
  await expect(page.locator('html')).toHaveCSS('font-size', '16px');
  await expect(page.getByRole('status')).toContainText(copy.settings.resetDone);
});
