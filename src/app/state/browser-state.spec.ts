import { TestBed } from '@angular/core/testing';
import { flushMicrotasks } from '../../testing/fakes';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { setPageVisible } from '../../testing/visibility';
import { MetronomeStore } from './metronome.store';
import { PageVisibility } from './page-visibility';
import { SettingsStore } from './settings.store';
import { UiStore } from './ui.store';
import { WakeLock } from './wake-lock';

describe('PageVisibility', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('follows the document visibility', () => {
    setPageVisible(true);
    const visibility = TestBed.inject(PageVisibility);
    expect(visibility.visible()).toBe(true);
    setPageVisible(false);
    expect(visibility.visible()).toBe(false);
    setPageVisible(true);
    expect(visibility.visible()).toBe(true);
  });

  it('stops listening when destroyed', () => {
    setPageVisible(true);
    const visibility = TestBed.inject(PageVisibility);
    TestBed.resetTestingModule();
    setPageVisible(false);
    expect(visibility.visible()).toBe(true);
  });
});

describe('UiStore', () => {
  it('opens and closes the settings', () => {
    TestBed.resetTestingModule();
    const ui = TestBed.inject(UiStore);
    expect(ui.showSettings()).toBe(false);
    ui.openSettings();
    expect(ui.showSettings()).toBe(true);
    ui.closeSettings();
    expect(ui.showSettings()).toBe(false);
  });
});

describe('WakeLock', () => {
  let requested: number;
  let released: number;
  let listeners: (() => void)[];

  const settle = async (): Promise<void> => {
    TestBed.tick();
    await flushMicrotasks();
    TestBed.tick();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    setPageVisible(true);
    new MetronomeDriver();
    requested = 0;
    released = 0;
    listeners = [];
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          requested += 1;
          return {
            release: async () => {
              released += 1;
            },
            addEventListener: (_: string, listener: () => void) => listeners.push(listener),
          };
        },
      },
    });
  });

  afterEach(() => {
    TestBed.inject(MetronomeStore).stop();
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  it('keeps the screen on while the click plays', async () => {
    TestBed.inject(WakeLock);
    const metronome = TestBed.inject(MetronomeStore);
    await settle();
    expect(requested).toBe(0);
    metronome.toggle();
    await settle();
    expect(requested).toBe(1);
    metronome.toggle();
    await settle();
    expect(released).toBe(1);
  });

  it('asks again after returning from the background', async () => {
    TestBed.inject(WakeLock);
    TestBed.inject(MetronomeStore).toggle();
    await settle();
    setPageVisible(false);
    listeners.forEach((listener) => listener());
    await settle();
    setPageVisible(true);
    await settle();
    expect(requested).toBe(2);
  });

  it('respects the Keep screen awake setting', async () => {
    TestBed.inject(SettingsStore).update({ keepAwake: false });
    TestBed.inject(WakeLock);
    TestBed.inject(MetronomeStore).toggle();
    await settle();
    expect(requested).toBe(0);
  });

  it('carries on when the lock is refused or unsupported', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: () => Promise.reject(new Error('low battery')) },
    });
    TestBed.inject(WakeLock);
    TestBed.inject(MetronomeStore).toggle();
    await expect(settle()).resolves.toBeUndefined();

    delete (navigator as { wakeLock?: unknown }).wakeLock;
    TestBed.inject(MetronomeStore).stop();
    TestBed.inject(MetronomeStore).toggle();
    await expect(settle()).resolves.toBeUndefined();
  });

  it('lets go when playback stopped while the lock was being granted', async () => {
    TestBed.inject(WakeLock);
    const metronome = TestBed.inject(MetronomeStore);
    metronome.toggle();
    await flushMicrotasks();
    TestBed.tick();
    metronome.stop();
    await settle();
    expect(released).toBeGreaterThanOrEqual(1);
  });
});
