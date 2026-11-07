import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const pill = (page: Page) => page.locator('app-tuning-state-pill');
const note = (page: Page) => page.getByRole('img', { name: /^(No note|[A-H][♯♭]? \d)$/ });

test.beforeEach(async ({ page, wide }) => {
  await page.goto(wide ? '/' : '/tuner');
  await expect(pill(page)).toContainText('Tuner off');
});

test('names the note it hears and says whether it is in tune, high or low', async ({
  page,
  app,
}) => {
  await app.tone(442);
  await page.getByRole('button', { name: 'Start tuner' }).click();
  await expect(note(page)).toHaveAccessibleName('A 4');
  await expect(pill(page)).toContainText('✓ In tune');
  await expect(pill(page).getByRole('status')).toHaveText('In tune');
  await expect(
    page.getByRole('img', { name: /on the bass clef staff|on the treble clef staff/ }),
  ).toHaveAccessibleName('A4 on the bass clef staff');

  // About 39 cents sharp, then 28 cents flat of A.
  await app.tone(452);
  await expect(pill(page)).toContainText('▲ High · +39 ¢');
  await expect(pill(page).getByRole('status')).toHaveText('High');
  await app.tone(435);
  await expect(pill(page)).toContainText('▼ Low');

  await page.getByRole('button', { name: 'Stop tuner' }).click();
  await expect(pill(page)).toContainText('Tuner off');
  await expect(note(page)).toHaveAccessibleName('No note');
});

test('follows the reference pitch and the accidentals setting', async ({ page, app }) => {
  await page.getByRole('button', { name: 'Reference pitch: A = 442 Hz' }).click();
  const sheet = page.getByRole('dialog', { name: 'Reference pitch' });
  await sheet.getByRole('button', { name: '440', exact: true }).click();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Reference pitch: A = 440 Hz' })).toBeVisible();

  // 466.16 Hz is B♭ at A = 440, in German note names plain B.
  await app.tone(466.16);
  await page.getByRole('button', { name: 'Start tuner' }).click();
  await expect(note(page)).toHaveAccessibleName('B 4');
  await expect(pill(page)).toContainText('In tune');

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('radio', { name: '♯ Sharps' }).click();
  await settings.getByRole('button', { name: 'Close' }).click();
  await expect(note(page)).toHaveAccessibleName('A♯ 4');
});

test('explains a denied microphone', async ({ page, app }) => {
  await app.denyMicrophone();
  await page.getByRole('button', { name: 'Start tuner' }).click();
  await expect(pill(page)).toContainText('Microphone access needed');
  await expect(page.getByText('Microphone access is off.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start tuner' })).toBeVisible();
});

test('pauses while the click plays', async ({ page, app }) => {
  await app.tone(442);
  await page.getByRole('button', { name: 'Start tuner' }).click();
  await expect(pill(page)).toContainText('In tune');
  await page.locator('body').focus();
  await page.keyboard.press('Space');
  await expect(pill(page)).toContainText('Paused while the click plays');
  await page.keyboard.press('Space');
  await expect(pill(page)).toContainText('In tune');
});

test('drum lugs: stores a strike per lug and says which to tighten or loosen', async ({
  page,
  app,
}) => {
  await page.getByRole('radio', { name: 'Drum lugs' }).click();
  const lugs = page.getByRole('spinbutton', { name: 'Lugs' });
  await lugs.focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: /^Lug \d/ })).toHaveCount(3);
  await page.getByRole('button', { name: 'Start tuner' }).click();

  /** A strike: a moment of silence, then a steady tone. */
  const strike = async (frequency: number, lug: number): Promise<void> => {
    await app.tone(null);
    await page.waitForTimeout(250);
    await app.tone(frequency);
    await expect(
      page.getByRole('button', { name: new RegExp(`^Lug ${lug}, -?\\d+ cents`) }),
    ).toBeVisible();
  };
  await strike(200, 1);
  await strike(206, 2);
  await strike(200, 3);
  await app.tone(null);

  // Lug 2 is about 34 cents above the others' average.
  await expect(page.getByText(/Lug 2: ▲ \d+ ¢ high, loosen/)).toBeVisible();
  await expect(page.getByText(/^Spread \d+ ¢$/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('button', { name: 'Lug 1, not measured' })).toBeVisible();
});
