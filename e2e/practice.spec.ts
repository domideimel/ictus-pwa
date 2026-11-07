import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const practiceButton = (page: Page) => page.getByRole('button', { name: /^Practice tools/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Practice' });
const chips = (page: Page) => page.getByRole('group', { name: 'Practice tools on' });

test.beforeEach(async ({ page, wide }) => {
  await page.goto(wide ? '/' : '/metronome');
  await practiceButton(page).click();
  await expect(sheet(page)).toBeVisible();
});

test('switches tools on in the sheet and off from their chips', async ({ page }) => {
  await sheet(page).getByRole('switch', { name: 'Gap click' }).click();
  await sheet(page).getByRole('radio', { name: '3:2' }).click();
  await expect(sheet(page).getByRole('status')).toHaveText(/2 tools on/);
  await sheet(page).getByRole('button', { name: 'Close' }).click();

  await expect(practiceButton(page)).toHaveAccessibleName('Practice tools, 2 on');
  await expect(chips(page)).toContainText('Gap 2 on · 2 off');
  await expect(chips(page)).toContainText('Poly 3:2');
  await chips(page).getByRole('button', { name: 'Turn off polyrhythm' }).click();
  await expect(practiceButton(page)).toHaveAccessibleName('Practice tools, 1 on');

  // The chip opens the sheet again, where the settings were kept.
  await chips(page).getByRole('button', { name: /Gap/ }).click();
  await expect(sheet(page).getByRole('switch', { name: 'Gap click' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await sheet(page).getByRole('button', { name: 'Turn all off' }).click();
  await expect(sheet(page).getByRole('switch', { name: 'Gap click' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('steppers stay disabled until their tool is on, and keep to their range', async ({ page }) => {
  const play = sheet(page).getByRole('spinbutton', { name: 'Play bars' });
  await expect(play).toHaveAttribute('aria-disabled', 'true');
  await sheet(page).getByRole('switch', { name: 'Gap click' }).click();
  await expect(play).not.toHaveAttribute('aria-disabled');
  await play.focus();
  await page.keyboard.press('End');
  await expect(play).toHaveAttribute('aria-valuenow', '16');
  await page.keyboard.press('ArrowUp');
  await expect(play).toHaveAttribute('aria-valuenow', '16');
});

test('turns every tool off at once from the chips', async ({ page }) => {
  await sheet(page).getByRole('switch', { name: 'Gap click' }).click();
  await sheet(page).getByRole('switch', { name: 'Speed trainer' }).click();
  await sheet(page).getByRole('button', { name: 'Close' }).click();
  await chips(page).getByRole('button', { name: 'Turn all off' }).click();
  await expect(chips(page)).toBeHidden();
  await expect(practiceButton(page)).toHaveAccessibleName('Practice tools');
});

test('the speed trainer shows the live tempo while playing', async ({ page }) => {
  await sheet(page).getByRole('switch', { name: 'Speed trainer' }).click();
  await sheet(page).getByRole('button', { name: 'Close' }).click();
  await expect(chips(page)).toContainText('+4 every 4 bars → 160');
  await page.getByRole('button', { name: 'Start metronome' }).click();
  await expect(chips(page)).toContainText('Trainer · now 120 → 160');
  await page.getByRole('button', { name: 'Stop metronome' }).click();
});

test('the gap click goes silent on its muted bars', async ({ page, app }) => {
  await sheet(page).getByRole('switch', { name: 'Gap click' }).click();
  for (const name of ['Play bars', 'Mute bars']) {
    const stepper = sheet(page).getByRole('spinbutton', { name });
    await expect(stepper).not.toHaveAttribute('aria-disabled');
    await stepper.focus();
    await page.keyboard.press('Home');
    await expect(stepper).toHaveAttribute('aria-valuenow', '1');
  }
  await sheet(page).getByRole('button', { name: 'Close' }).click();
  // Play 1 bar, mute 1 bar at 300 BPM: a bar lasts 0.8 s.
  const tempo = page.getByRole('slider', { name: 'Tempo' });
  await tempo.focus();
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Start metronome' }).click();
  await expect(chips(page)).toContainText('Silent · keep time');
  await expect.poll(async () => (await app.clicks()).length).toBeGreaterThanOrEqual(5);
  await page.getByRole('button', { name: 'Stop metronome' }).click();
  const [first = 0, ...rest] = await app.clicks();
  // The four clicks of bar 1 are 0.2 s apart; the next click is bar 3, 0.8 s later than bar 2 would be.
  expect(rest.slice(0, 4).map((time) => Math.round((time - first) * 10) / 10)).toEqual([
    0.2, 0.4, 0.6, 1.6,
  ]);
});

test('the rest counter counts the bars and signals the entrance', async ({ page }) => {
  const bars = sheet(page).getByRole('spinbutton', { name: 'Bars tacet' });
  await bars.focus();
  await page.keyboard.press('Home');
  await sheet(page).getByRole('button', { name: 'Start counting' }).click();

  const rest = page.getByRole('dialog', { name: 'Rest counter' });
  await expect(rest).toBeVisible();
  await expect(rest).toContainText('of 1');
  // One bar of 4/4 at 120 BPM is two seconds.
  await expect(rest.getByText('Play!')).toBeVisible({ timeout: 6_000 });
  await expect(rest).toContainText('1 bars done');
  await rest.getByRole('button', { name: 'Done' }).click();
  await expect(rest).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible();
});

test('Escape ends the rest counter', async ({ page }) => {
  await sheet(page).getByRole('button', { name: 'Start counting' }).click();
  const rest = page.getByRole('dialog', { name: 'Rest counter' });
  await expect(rest).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(rest).toBeHidden();
});
