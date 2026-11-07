import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { AppHarness } from './fixtures';
import { expect, test } from './fixtures';

/**
 * Every screen, sheet and dialog passes axe (WCAG 2.2 A and AA, best practices), in light and dark
 * mode, in every browser and device. Real layout, so colour contrast is checked too.
 */
interface Scenario {
  readonly name: string;
  /**
   * Firefox 159 on Linux crashes its content process while axe walks the page with the click
   * playing or after drum strikes; these states are checked in Chromium and WebKit.
   */
  readonly skipFirefox?: true;
  /** Leaves the page in the state to check. */
  readonly setup: (page: Page, app: AppHarness, wide: boolean) => Promise<void>;
}

const metronome = (page: Page, wide: boolean) => page.goto(wide ? '/' : '/metronome');
const tuner = (page: Page, wide: boolean) => page.goto(wide ? '/' : '/tuner');

async function openSetlistsWithPiece(page: Page, wide: boolean): Promise<void> {
  await metronome(page, wide);
  await page.getByRole('button', { name: 'Setlists' }).click();
  await page.getByRole('button', { name: 'Save current as piece' }).click();
  await page
    .getByRole('dialog', { name: 'Save piece' })
    .getByRole('button', { name: 'Save' })
    .click();
}

const SCENARIOS: readonly Scenario[] = [
  { name: 'metronome', setup: (page, _, wide) => metronome(page, wide).then(() => undefined) },
  {
    name: 'metronome playing 7/8 in groups with practice tools on',
    skipFirefox: true,
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: '7/8', exact: true }).click();
      await page.getByRole('radio', { name: /^Groups/ }).click();
      await page.getByRole('radio', { name: 'Eighth', exact: true }).click();
      await page.getByRole('button', { name: /^Practice tools/ }).click();
      const sheet = page.getByRole('dialog', { name: 'Practice' });
      await sheet.getByRole('switch', { name: 'Gap click' }).click();
      await sheet.getByRole('switch', { name: 'Speed trainer' }).click();
      await sheet.getByRole('button', { name: 'Close' }).click();
      await page.getByRole('button', { name: 'Start metronome' }).click();
      await expect(page.locator('app-beat-dots .bg-accent').first()).toBeVisible();
    },
  },
  {
    name: 'practice sheet with tools on',
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: /^Practice tools/ }).click();
      await page.getByRole('switch', { name: 'Gap click' }).click();
      await page.getByRole('radio', { name: '3:2' }).click();
    },
  },
  {
    name: 'time signature sheet',
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: 'More' }).click();
      await expect(page.getByRole('dialog', { name: 'Time signature' })).toBeVisible();
    },
  },
  {
    name: 'setlists, empty',
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: 'Setlists' }).click();
      await expect(page.getByText('No setlists yet.')).toBeVisible();
    },
  },
  {
    name: 'setlists in edit mode, with the setlist bar',
    setup: async (page, _, wide) => {
      await openSetlistsWithPiece(page, wide);
      await page.getByRole('button', { name: 'Edit' }).click();
    },
  },
  {
    name: 'name dialog with an error',
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: 'Setlists' }).click();
      await page.getByRole('button', { name: 'New setlist' }).click();
      const dialog = page.getByRole('dialog', { name: 'New setlist' });
      await dialog.getByRole('textbox', { name: 'Name' }).fill('');
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(dialog.getByText('Enter a name.')).toBeVisible();
    },
  },
  {
    name: 'delete confirmation',
    setup: async (page, _, wide) => {
      await openSetlistsWithPiece(page, wide);
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByRole('button', { name: 'Delete Setlist 1' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
    },
  },
  {
    name: 'rest counter',
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: /^Practice tools/ }).click();
      await page.getByRole('button', { name: 'Start counting' }).click();
      await expect(page.getByRole('dialog', { name: 'Rest counter' })).toBeVisible();
    },
  },
  {
    name: 'settings',
    setup: async (page, _, wide) => {
      await metronome(page, wide);
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    },
  },
  {
    name: 'tuner listening, high',
    setup: async (page, app, wide) => {
      await tuner(page, wide);
      await app.tone(452);
      await page.getByRole('button', { name: 'Start tuner' }).click();
      await expect(page.locator('app-tuning-state-pill')).toContainText('High');
    },
  },
  {
    name: 'tuner in tune',
    setup: async (page, app, wide) => {
      await tuner(page, wide);
      await app.tone(442);
      await page.getByRole('button', { name: 'Start tuner' }).click();
      await expect(page.locator('app-tuning-state-pill')).toContainText('In tune');
    },
  },
  {
    name: 'tuner with the microphone denied',
    setup: async (page, app, wide) => {
      await tuner(page, wide);
      await app.denyMicrophone();
      await page.getByRole('button', { name: 'Start tuner' }).click();
      await expect(page.getByText('Microphone access is off.')).toBeVisible();
    },
  },
  {
    name: 'drum tuner with readings',
    skipFirefox: true,
    setup: async (page, app, wide) => {
      await tuner(page, wide);
      await page.getByRole('radio', { name: 'Drum lugs' }).click();
      await page.getByRole('button', { name: 'Start tuner' }).click();
      await app.tone(200);
      await expect(page.getByRole('button', { name: /^Lug 1, -?\d+ cents/ })).toBeVisible();
      await app.tone(null);
      await page.waitForTimeout(250);
      await app.tone(212);
      await expect(page.getByRole('button', { name: /^Lug 2, -?\d+ cents/ })).toBeVisible();
    },
  },
  {
    name: 'reference pitch sheet',
    setup: async (page, _, wide) => {
      await tuner(page, wide);
      await page.getByRole('button', { name: /^Reference pitch/ }).click();
      await expect(page.getByRole('dialog', { name: 'Reference pitch' })).toBeVisible();
    },
  },
];

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    for (const scenario of SCENARIOS) {
      test(scenario.name, async ({ page, app, wide, browserName }) => {
        test.skip(
          browserName === 'firefox' && scenario.skipFirefox === true,
          'Firefox crashes under axe in this state; checked in Chromium and WebKit.',
        );
        await scenario.setup(page, app, wide);
        // Let transitions (needle, switches, pressed states) settle before measuring contrast.
        await page.waitForTimeout(250);
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();
        const found = violations.flatMap((violation) =>
          violation.nodes.map(
            (node) => `${violation.id}: ${node.target.join(' ')} (${node.failureSummary ?? ''})`,
          ),
        );
        expect(found).toEqual([]);
      });
    }
  });
}
