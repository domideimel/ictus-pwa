import { expect, test } from './fixtures';

test.describe('phones', () => {
  test.skip(({ wide }) => wide, 'Phones only: tablets and desktops show one combined screen.');

  test('switches between the metronome and tuner tabs, also by address', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/metronome$/);
    await expect(page).toHaveTitle('Metronome · Ictus');
    const tabs = page.getByRole('navigation', { name: 'Screens' });
    await expect(tabs.getByRole('link', { name: 'Metronome' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await tabs.getByRole('link', { name: 'Tuner' }).click();
    await expect(page).toHaveURL(/\/tuner$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Tuner' })).toBeAttached();

    // A reload or a shared link opens the same tab; unknown paths go to the metronome.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Start tuner' })).toBeVisible();
    await page.goto('/somewhere');
    await expect(page).toHaveURL(/\/metronome$/);
  });

  test('switches the tuner off when leaving its tab', async ({ page }) => {
    await page.goto('/tuner');
    await page.getByRole('button', { name: 'Start tuner' }).click();
    await expect(page.getByRole('button', { name: 'Stop tuner' })).toBeVisible();
    await page.getByRole('link', { name: 'Metronome' }).click();
    await page.getByRole('link', { name: 'Tuner' }).click();
    await expect(page.getByRole('button', { name: 'Start tuner' })).toBeVisible();
  });
});

test.describe('tablets and desktops', () => {
  test.skip(({ wide }) => !wide, 'The combined screen needs 768 px or more.');

  test('shows metronome and tuner together', async ({ page }) => {
    await page.goto('/tuner');
    await expect(page.getByRole('heading', { level: 1, name: 'Metronome & Tuner' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Metronome' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tuner' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Screens' })).toHaveCount(0);
    // The label is shortened to "Mic off" below 1024 px.
    await expect(page.getByRole('status').filter({ hasText: /Mic(rophone)? off/ })).toBeVisible();
  });

  test('lists the keyboard shortcuts for mouse and trackpad users', async ({ page, isMobile }) => {
    test.skip(
      isMobile || (page.viewportSize()?.width ?? 0) < 1024,
      'Fine pointers, 1024 px and up.',
    );
    await page.goto('/');
    await expect(page.locator('footer')).toContainText('Space');
    await expect(page.locator('footer')).toContainText('Tap tempo');
  });
});

test('keeps settings after a reload', async ({ page, wide }) => {
  await page.goto(wide ? '/' : '/metronome');
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('combobox', { name: 'Click sound' }).selectOption('woodblock');
  await settings.getByRole('switch', { name: 'Vibration' }).click();
  await settings.getByRole('radio', { name: 'Treble' }).click();
  // Escape closes a sheet, as the native dialog does.
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(settings.getByRole('combobox', { name: 'Click sound' })).toHaveValue('woodblock');
  await expect(settings.getByRole('switch', { name: 'Vibration' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  await expect(settings.getByRole('radio', { name: 'Treble' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('is served with the security headers from vercel.json', async ({ page }) => {
  const response = await page.goto('/metronome');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['permissions-policy']).toContain('microphone=(self)');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  // Every test also fails on a CSP violation, so the app works under this policy.
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('works offline once the service worker has installed', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Service worker caching is checked once, in Chromium.');
    test.setTimeout(60_000);
    await page.goto('/metronome');
    // Registered once the app is stable (after 30 s at most); then it precaches the app group.
    await page.waitForFunction(
      async () => {
        const names = await caches.keys();
        const app = names.find((name) => name.endsWith(':app:cache'));
        return app !== undefined && (await (await caches.open(app)).keys()).length >= 10;
      },
      null,
      { timeout: 45_000, polling: 250 },
    );
    // Reloaded online, the page is controlled by the worker.
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('slider', { name: 'Tempo' })).toBeVisible();
    await context.setOffline(false);
  });
});
