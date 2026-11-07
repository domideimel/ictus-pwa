import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideServiceWorker } from '@angular/service-worker';
import { byLabel, click, key } from '../testing/dom';
import { MetronomeDriver } from '../testing/metronome-driver';
import { TunerDriver } from '../testing/tuner-driver';
import { App } from './app';
import { routes } from './app.routes';
import { defaultLevels } from './music/meter';
import { LibraryStore } from './state/library.store';
import { MetronomeStore } from './state/metronome.store';
import { SettingsStore } from './state/settings.store';
import { TunerStore } from './state/tuner.store';

const resize = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
};

describe('App', () => {
  let metronome: InstanceType<typeof MetronomeStore>;
  let driver: MetronomeDriver;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    resize(390);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    });
    driver = new MetronomeDriver();
  });

  afterEach(() => {
    metronome.stop();
  });

  const start = async (url = '/') => {
    const harness = await RouterTestingHarness.create();
    const fixture = TestBed.createComponent(App);
    await harness.navigateByUrl(url);
    await fixture.whenStable();
    metronome = TestBed.inject(MetronomeStore);
    return { harness, fixture, element: fixture.nativeElement as HTMLElement };
  };

  describe('phone layout', () => {
    it('shows the metronome tab first', async () => {
      const { element } = await start();
      const tabs = [...element.querySelectorAll('nav a')].map((link) => link.textContent.trim());
      expect(tabs).toEqual(['Metronome', 'Tuner']);
      expect(element.querySelector('[aria-current="page"]')?.textContent).toContain('Metronome');
      expect(element.querySelector('app-metronome-panel')).not.toBeNull();
    });

    it('switches to the tuner tab and tells the tuner it is on screen', async () => {
      const { harness, fixture, element } = await start();
      const tuner = TestBed.inject(TunerStore);
      expect(tuner.onScreen()).toBe(false);
      await harness.navigateByUrl('/tuner');
      await fixture.whenStable();
      expect(element.querySelector('[aria-current="page"]')?.textContent).toContain('Tuner');
      expect(element.querySelector('app-tuner-panel')).not.toBeNull();
      expect(tuner.onScreen()).toBe(true);
    });

    it('redirects unknown paths to the metronome', async () => {
      const { element } = await start('/nowhere');
      expect(element.querySelector('app-metronome-panel')).not.toBeNull();
    });

    it('opens settings from either tab', async () => {
      const { harness, fixture, element } = await start();
      await click(fixture, byLabel(element, 'Settings'));
      expect(element.querySelector('app-settings-sheet dialog[open]')).not.toBeNull();
      await click(fixture, byLabel(element.querySelector('app-settings-sheet')!, 'Close'));
      expect(element.querySelector('app-settings-sheet')).toBeNull();

      await harness.navigateByUrl('/tuner');
      await fixture.whenStable();
      await click(fixture, byLabel(element, 'Settings'));
      expect(element.querySelector('app-settings-sheet')).not.toBeNull();
    });

    it('shows the rest counter over everything while it runs', async () => {
      const { fixture, element } = await start();
      metronome.startRest(4, false);
      await fixture.whenStable();
      expect(element.querySelector('app-rest-counter dialog[open]')).not.toBeNull();
      metronome.endRest();
      await fixture.whenStable();
      expect(element.querySelector('app-rest-counter')).toBeNull();
    });
  });

  describe('wide layout', () => {
    it('shows metronome and tuner together with the shortcut bar', async () => {
      resize(1280);
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: () => ({
          matches: true,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }),
      });
      const { fixture, element } = await start();
      expect(element.querySelector('nav')).toBeNull();
      expect(element.querySelector('app-combined-view app-metronome-panel section')).not.toBeNull();
      expect(element.querySelector('app-combined-view app-tuner-panel section')).not.toBeNull();
      expect(TestBed.inject(TunerStore).onScreen()).toBe(true);
      expect(element.querySelector('footer')?.textContent).toContain('Start / stop');
      expect(element.textContent).toContain('Beats · click to accent');
      expect(element.querySelector('[role="status"]')?.textContent.trim()).toBe('Microphone off');

      await click(fixture, byLabel(element.querySelector('app-combined-view header')!, 'Settings'));
      expect(element.querySelector('app-settings-sheet')).not.toBeNull();
      delete (window as { matchMedia?: unknown }).matchMedia;
    });

    it('shows when the microphone is on', async () => {
      resize(900);
      const tunerDriver = new TunerDriver();
      const { fixture, element } = await start();
      await tunerDriver.switchOn();
      await fixture.whenStable();
      expect(element.querySelector('app-combined-view [role="status"]')?.textContent.trim()).toBe(
        'Mic on',
      );
    });
  });

  describe('keyboard and pedals', () => {
    it('starts and stops with Space', async () => {
      const { fixture } = await start();
      const space = key(document.body, ' ');
      expect(space.defaultPrevented).toBe(true);
      await driver.settle();
      expect(metronome.isPlaying()).toBe(true);
      key(document.body, ' ');
      await fixture.whenStable();
      expect(metronome.isPlaying()).toBe(false);
    });

    it('taps the tempo with T', async () => {
      await start();
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(600);
      key(document.body, 't');
      key(document.body, 'T');
      vi.restoreAllMocks();
      expect(metronome.bpm()).toBe(100);
    });

    it('ignores a held key, so Space and T fire once', async () => {
      await start();
      key(document.body, ' ');
      await driver.settle();
      expect(metronome.isPlaying()).toBe(true);
      expect(key(document.body, ' ', { repeat: true }).defaultPrevented).toBe(false);
      key(document.body, 't', { repeat: true });
      key(document.body, 't', { repeat: true });
      expect(metronome.isPlaying()).toBe(true);
      expect(metronome.bpm()).toBe(120);
    });

    it('does not tap the tempo with T inside a dialog', async () => {
      const { fixture, element } = await start();
      await click(fixture, byLabel(element, 'Settings'));
      const closeButton = byLabel(element.querySelector('app-settings-sheet')!, 'Close');
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(600);
      key(closeButton, 't');
      key(closeButton, 't');
      vi.restoreAllMocks();
      expect(metronome.bpm()).toBe(120);
    });

    it('taps with the left pedal and starts with the right pedal', async () => {
      await start();
      vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(500);
      expect(key(document.body, 'ArrowLeft').defaultPrevented).toBe(true);
      key(document.body, 'PageUp');
      vi.restoreAllMocks();
      expect(metronome.bpm()).toBe(120);
      key(document.body, 'PageDown');
      await driver.settle();
      expect(metronome.isPlaying()).toBe(true);
      key(document.body, 'ArrowRight');
      expect(metronome.isPlaying()).toBe(false);
    });

    it('steps through the setlist with the pedals in previous / next mode', async () => {
      await start();
      TestBed.inject(SettingsStore).update({ pedalMode: 'previousAndNext' });
      const library = TestBed.inject(LibraryStore);
      const list = library.addSetlist('Concert');
      const pieces = [70, 140].map((bpm, i) =>
        library.addPiece(list.id, `P${i}`, {
          bpm,
          timeSignature: { beats: 3, unit: 4 },
          grouping: [3],
          pulse: 'unit',
          levels: defaultLevels(3),
          subdivision: 1,
          swing: 0.5,
        }),
      );
      key(document.body, 'ArrowRight');
      expect(metronome.bpm()).toBe(120);
      library.setActivePiece({ setlistId: list.id, pieceId: pieces[0]!.id });
      key(document.body, 'ArrowDown');
      expect(metronome.bpm()).toBe(140);
      key(document.body, 'ArrowUp');
      expect(metronome.bpm()).toBe(70);
      expect(metronome.isPlaying()).toBe(false);
    });

    it('leaves keys alone while typing, with modifiers, or when already handled', async () => {
      await start();
      const input = document.createElement('input');
      document.body.append(input);
      expect(key(input, ' ').defaultPrevented).toBe(false);
      input.remove();
      expect(key(document.body, ' ', { metaKey: true }).defaultPrevented).toBe(false);
      expect(key(document.body, 'ArrowLeft', { ctrlKey: true }).defaultPrevented).toBe(false);
      expect(key(document.body, 't', { altKey: true }).defaultPrevented).toBe(false);
      const handled = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      handled.preventDefault();
      document.body.dispatchEvent(handled);
      expect(metronome.isPlaying()).toBe(false);
    });

    it('lets dialogs and radio groups keep Space and the arrows', async () => {
      const { fixture, element } = await start();
      await click(fixture, byLabel(element, 'Settings'));
      const closeButton = byLabel(element.querySelector('app-settings-sheet')!, 'Close');
      expect(key(closeButton, ' ').defaultPrevented).toBe(false);
      expect(key(closeButton, 'ArrowLeft').defaultPrevented).toBe(false);
      expect(metronome.isPlaying()).toBe(false);

      // A radio group moves its own selection with the arrows; the pedal action doesn't fire.
      const radio = element.querySelector('app-subdivision-picker [role="radio"]') as HTMLElement;
      key(radio, 'ArrowRight');
      expect(metronome.subdivision()).toBe(2);
      expect(metronome.isPlaying()).toBe(false);
    });
  });
});
