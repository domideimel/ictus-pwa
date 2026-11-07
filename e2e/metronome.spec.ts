import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const open = async (page: Page, wide: boolean): Promise<void> => {
  await page.goto(wide ? '/' : '/metronome');
  await expect(page.getByRole('slider', { name: 'Tempo' })).toBeVisible();
};

const tempo = (page: Page) => page.getByRole('slider', { name: 'Tempo' });
const beat = (page: Page, n: number) =>
  page.getByRole('button', { name: new RegExp(`^Beat ${n},`) });
/** Gaps between the scheduled clicks, rounded to the millisecond. */
const gaps = (clicks: number[]): number[] =>
  clicks.slice(1).map((time, i) => Math.round((time - (clicks[i] ?? 0)) * 1000));

test.beforeEach(async ({ page, wide }) => {
  await open(page, wide);
});

test('starts and stops with the play button and Space, lighting the beats as they sound', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Start metronome' }).click();
  // Within a beat or two one of the dots lights up, in step with the audio clock.
  await expect(page.locator('app-beat-dots .bg-accent').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible();

  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Stop metronome' })).toBeVisible();
  await page.keyboard.press('Space');
});

test('schedules the clicks at the tempo, with subdivisions in between', async ({ page, app }) => {
  await page.getByRole('radio', { name: 'Eighth', exact: true }).click();
  await page.getByRole('button', { name: 'Start metronome' }).click();
  await expect.poll(async () => (await app.clicks()).length).toBeGreaterThanOrEqual(5);
  await page.getByRole('button', { name: 'Stop metronome' }).click();
  // 120 BPM in eighths: a click every 250 ms on the audio clock.
  expect(gaps((await app.clicks()).slice(0, 5))).toEqual([250, 250, 250, 250]);
});

test('changes the tempo with the nudge buttons, holding, the keyboard and the dial', async ({
  page,
}) => {
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '120');
  await page.getByRole('button', { name: 'Plus 5 BPM' }).click();
  await page.getByRole('button', { name: 'Minus 1 BPM' }).click();
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '124');

  // Holding +1 keeps counting up.
  await page.getByRole('button', { name: 'Plus 1 BPM' }).hover();
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  expect(Number(await tempo(page).getAttribute('aria-valuenow'))).toBeGreaterThan(127);

  await tempo(page).focus();
  await page.keyboard.press('End');
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '300');
  await page.keyboard.press('Home');
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '20');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('ArrowUp');
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '31');
  await expect(tempo(page)).toHaveAttribute('aria-valuetext', '31 BPM, quarter notes, Grave');

  // Dragging clockwise around the centre speeds up.
  const box = (await tempo(page).boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx - box.width * 0.4, cy);
  await page.mouse.down();
  for (const [dx, dy] of [
    [-0.3, -0.3],
    [0, -0.4],
    [0.3, -0.3],
  ] as const)
    await page.mouse.move(cx + dx * box.width, cy + dy * box.height, { steps: 4 });
  await page.mouse.up();
  expect(Number(await tempo(page).getAttribute('aria-valuenow'))).toBeGreaterThan(100);
});

/** Taps every `ms`; the result allows for the test's own timing jitter on slow runners. */
const tapEvery = async (page: Page, ms: number, tap: () => Promise<void>): Promise<number> => {
  for (let i = 0; i < 4; i++) {
    await tap();
    await page.waitForTimeout(ms);
  }
  return Number(await tempo(page).getAttribute('aria-valuenow'));
};

test('taps the tempo with the Tap button', async ({ page }) => {
  const tap = page.getByRole('button', { name: 'Tap tempo' });
  const tapped = await tapEvery(page, 500, () => tap.click());
  // 500 ms apart is 120 BPM.
  expect(tapped).toBeGreaterThan(95);
  expect(tapped).toBeLessThanOrEqual(121);
});

test('taps the tempo with the T key', async ({ page }) => {
  const tapped = await tapEvery(page, 300, () => page.keyboard.press('t'));
  // 300 ms apart is 200 BPM.
  expect(tapped).toBeGreaterThan(150);
  expect(tapped).toBeLessThanOrEqual(201);
});

test('cycles each beat through accent, normal and mute', async ({ page }) => {
  await expect(beat(page, 1)).toHaveAccessibleName('Beat 1, accent');
  await beat(page, 1).click();
  await expect(beat(page, 1)).toHaveAccessibleName('Beat 1, normal');
  await beat(page, 2).click();
  await expect(beat(page, 2)).toHaveAccessibleName('Beat 2, muted');
  await beat(page, 2).click();
  await expect(beat(page, 2)).toHaveAccessibleName('Beat 2, accent');
});

test('odd meters: groupings, counting in groups, and the matching subdivisions', async ({
  page,
}) => {
  await page.getByRole('button', { name: '7/8', exact: true }).click();
  await expect(page.getByRole('button', { name: '7/8', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: /^Beat \d/ })).toHaveCount(7);
  await page
    .getByRole('group', { name: 'Grouping' })
    .getByRole('button', { name: '3+2+2' })
    .click();

  await page.getByRole('radio', { name: 'Groups · 3' }).click();
  await expect(page.getByRole('button', { name: /^Beat \d/ })).toHaveCount(3);
  await expect(beat(page, 1)).toHaveAccessibleName('Beat 1, dotted quarter, accent');
  await expect(page.getByRole('radio', { name: 'Beat' })).toBeVisible();
  await expect(tempo(page)).toHaveAttribute('aria-valuetext', /eighth notes/);
});

test('picks any meter from More', async ({ page }) => {
  await page.getByRole('button', { name: 'More' }).click();
  const sheet = page.getByRole('dialog', { name: 'Time signature' });
  const beats = sheet.getByRole('spinbutton', { name: 'Beats per bar' });
  await beats.focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowUp');
  await sheet.getByRole('radio', { name: '16' }).click();
  await sheet.getByRole('button', { name: 'Use 11/16' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('button', { name: '11/16 ⋯' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Beat \d/ })).toHaveCount(11);
});

test('moves through subdivisions with the keyboard and offers swing for pairs', async ({
  page,
}) => {
  await page.getByRole('radio', { name: 'Quarter' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Eighth', exact: true })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Eighth', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  const swing = page.getByRole('slider', { name: 'Swing' });
  await expect(swing).toHaveAttribute('aria-valuetext', 'Straight');
  await swing.fill('0.67');
  await expect(swing).toHaveAttribute('aria-valuetext', 'Triplet');

  await page.keyboard.press('End');
  await page.getByRole('radio', { name: 'Eighth', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('radio', { name: 'Sextuplet' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(swing).toBeHidden();
});

test('remembers the setup after a reload', async ({ page, wide }) => {
  await page.getByRole('button', { name: '3/4', exact: true }).click();
  await page.getByRole('button', { name: 'Plus 5 BPM' }).click();
  await page.reload();
  await open(page, wide);
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '125');
  await expect(page.getByRole('button', { name: '3/4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
