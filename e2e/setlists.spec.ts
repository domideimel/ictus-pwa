import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Setlists' });
const tempo = (page: Page) => page.getByRole('slider', { name: 'Tempo' });

/** Saves the current metronome as a piece called `name` from the open setlist sheet. */
async function savePiece(page: Page, name: string, setlist?: string): Promise<void> {
  const area = setlist ? sheet(page).getByRole('region', { name: setlist }) : sheet(page);
  await area.getByRole('button', { name: 'Save current as piece' }).click();
  const dialog = page.getByRole('dialog', { name: 'Save piece' });
  await dialog.getByRole('textbox', { name: 'Name' }).fill(name);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
}

async function openSetlists(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Setlists' }).click();
  await expect(sheet(page)).toBeVisible();
}

test.beforeEach(async ({ page, wide }) => {
  await page.goto(wide ? '/' : '/metronome');
});

test('starts empty, saves pieces, and steps through them on stage', async ({ page, wide }) => {
  await openSetlists(page);
  await expect(sheet(page)).toContainText('No setlists yet.');
  await savePiece(page, 'Overture');
  await expect(sheet(page).getByRole('region', { name: 'Setlist 1' })).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Plus 5 BPM' }).click();
  await openSetlists(page);
  await savePiece(page, 'Finale', 'Setlist 1');
  await sheet(page).getByRole('button', { name: 'Close' }).click();

  // The bar shows the loaded piece; previous / next load the neighbours.
  await expect(page.getByRole('button', { name: /^Finale/ })).toContainText('2 of 2 · Setlist 1');
  await page.getByRole('button', { name: 'Previous piece' }).click();
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '120');
  await expect(page.getByRole('button', { name: 'Previous piece' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next piece' }).click();
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '125');

  // Everything is still there after a reload.
  await page.reload();
  await page.goto(wide ? '/' : '/metronome');
  await openSetlists(page);
  await expect(sheet(page).getByRole('button', { name: /^Overture/ })).toContainText(
    '120 BPM · 4/4 · ♩',
  );
  await sheet(page)
    .getByRole('button', { name: /^Overture/ })
    .click();
  await expect(sheet(page)).toBeHidden();
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '120');
});

test('renames, reorders, updates and deletes, asking before anything is lost', async ({ page }) => {
  await openSetlists(page);
  await savePiece(page, 'One');
  await savePiece(page, 'Two', 'Setlist 1');
  await sheet(page).getByRole('button', { name: 'Edit' }).click();

  await sheet(page).getByRole('button', { name: 'Rename Setlist 1' }).click();
  const naming = page.getByRole('dialog', { name: 'Rename setlist' });
  await naming.getByRole('textbox', { name: 'Name' }).fill('   ');
  await naming.getByRole('button', { name: 'Save' }).click();
  await expect(naming).toContainText('Enter a name.');
  await naming.getByRole('textbox', { name: 'Name' }).fill('Gala');
  await naming.getByRole('button', { name: 'Save' }).click();
  const gala = sheet(page).getByRole('region', { name: 'Gala' });
  await expect(gala).toBeVisible();

  await gala.getByRole('button', { name: 'Move Two up' }).click();
  await expect(gala.getByRole('listitem').first()).toContainText('Two');

  await gala.getByRole('button', { name: 'Update One with current settings' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Update “One”?' });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Update' }).click();
  await expect(confirm).toBeHidden();

  await gala.getByRole('button', { name: 'Delete Two' }).click();
  await page
    .getByRole('alertdialog', { name: 'Delete “Two”?' })
    .getByRole('button', { name: 'Cancel' })
    .click();
  await expect(gala.getByRole('button', { name: 'Delete Two' })).toBeVisible();
  await gala.getByRole('button', { name: 'Delete Two' }).click();
  await page
    .getByRole('alertdialog', { name: 'Delete “Two”?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(gala.getByRole('button', { name: 'Delete Two' })).toBeHidden();

  await sheet(page).getByRole('button', { name: 'Delete Gala' }).click();
  const deleteList = page.getByRole('alertdialog', { name: 'Delete “Gala”?' });
  await expect(deleteList).toContainText("Its piece is deleted too. This can't be undone.");
  await deleteList.getByRole('button', { name: 'Delete' }).click();
  await expect(sheet(page)).toContainText('No setlists yet.');
});

test('page-turner pedals step through the setlist in previous / next mode', async ({ page }) => {
  await openSetlists(page);
  await savePiece(page, 'Slow');
  await sheet(page).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Plus 5 BPM' }).click();
  await openSetlists(page);
  await savePiece(page, 'Fast', 'Setlist 1');
  await sheet(page).getByRole('button', { name: /^Slow/ }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings
    .getByRole('combobox', { name: 'Pedal' })
    .selectOption({ label: 'Previous · Next piece' });
  await settings.getByRole('button', { name: 'Close' }).click();

  await page.keyboard.press('ArrowRight');
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '125');
  await page.keyboard.press('PageUp');
  await expect(tempo(page)).toHaveAttribute('aria-valuenow', '120');
  await expect(page.getByRole('button', { name: 'Start metronome' })).toBeVisible();
});
