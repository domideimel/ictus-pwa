import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';

/** What the stand-ins below expose on `window.__e2e`. */
interface E2eWindow {
  __e2e: {
    /** Audio-clock times of every click the metronome scheduled. */
    clicks: number[];
    /** Frequency of the fake microphone; null is silence. */
    tone: number | null;
    denyMicrophone: boolean;
    setTone: (frequency: number | null) => void;
  };
  __e2eViolation?: (message: string) => void;
}

/**
 * Runs in the page before the app. Records the clicks the metronome schedules, and replaces the
 * microphone with a sine tone the test controls, the same in every browser (Playwright can only
 * fake devices in Chromium). Must be self-contained: it is serialised into the page.
 */
function installStandIns(): void {
  const page = window as unknown as Window & E2eWindow;
  let context: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  const apply = (): void => {
    const tone = page.__e2e.tone;
    if (!oscillator || !gain) return;
    if (tone !== null) oscillator.frequency.value = tone;
    gain.gain.value = tone === null ? 0 : 0.5;
  };
  page.__e2e = {
    clicks: [],
    tone: null,
    denyMicrophone: false,
    setTone: (frequency) => {
      page.__e2e.tone = frequency;
      apply();
    },
  };

  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (
    this: AudioBufferSourceNode,
    ...args: Parameters<AudioBufferSourceNode['start']>
  ): void {
    page.__e2e.clicks.push(args[0] ?? 0);
    start.apply(this, args);
  };

  // The tone's own audio context starts on the first press, a user gesture in every browser.
  const unlock = (): void => {
    context ??= new AudioContext();
    // Rejects if the page navigates away first (a reload in a test); nothing to do then.
    context.resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  const getUserMedia = async (): Promise<MediaStream> => {
    if (page.__e2e.denyMicrophone) throw new DOMException('Permission denied', 'NotAllowedError');
    context ??= new AudioContext();
    await context.resume();
    if (!oscillator || !gain) {
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.connect(gain);
      oscillator.start();
    }
    apply();
    // A fresh stream every time, as from a real microphone: the app stops the old one's tracks.
    const destination = context.createMediaStreamDestination();
    gain.connect(destination);
    return destination.stream;
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });

  document.addEventListener('securitypolicyviolation', (event) => {
    page.__e2eViolation?.(`${event.violatedDirective} blocked ${event.blockedURI}`);
  });
}

/** Drives the stand-ins from a test. */
export class AppHarness {
  constructor(private readonly page: Page) {}

  /** Clicks the metronome has scheduled so far. */
  clicks(): Promise<number[]> {
    return this.page.evaluate(() => (window as unknown as E2eWindow).__e2e.clicks);
  }

  /** What the fake microphone hears from now on; null is silence. */
  async tone(frequency: number | null): Promise<void> {
    await this.page.evaluate((value) => {
      (window as unknown as E2eWindow).__e2e.setTone(value);
    }, frequency);
  }

  async denyMicrophone(): Promise<void> {
    await this.page.evaluate(() => {
      (window as unknown as E2eWindow).__e2e.denyMicrophone = true;
    });
  }
}

interface Fixtures {
  app: AppHarness;
  /** Phones get two tabs; tablets and desktops (768 px and wider) the combined screen. */
  wide: boolean;
  /** Console errors a test expects, e.g. a logged microphone denial. */
  allowedErrors: RegExp[];
}

export const test = base.extend<Fixtures>({
  allowedErrors: [[], { option: true }],

  wide: async ({ viewport }, use) => {
    await use((viewport?.width ?? 0) >= 768);
  },

  page: async ({ page, allowedErrors }, use) => {
    const problems: string[] = [];
    const allowed = (text: string): boolean => allowedErrors.some((pattern) => pattern.test(text));
    await page.exposeFunction('__e2eViolation', (message: string) => {
      problems.push(`CSP: ${message}`);
    });
    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !allowed(message.text()))
        problems.push(`console error: ${message.text()}`);
    });
    await page.addInitScript(installStandIns);
    await use(page);
    expect(problems, 'errors, console errors or CSP violations in the page').toEqual([]);
  },

  app: async ({ page }, use) => {
    await use(new AppHarness(page));
  },
});

export { expect };
