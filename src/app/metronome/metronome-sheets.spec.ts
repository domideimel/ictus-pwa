import { TestBed } from '@angular/core/testing';
import { byLabel, click, key, pointer, render } from '../../testing/dom';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { MetronomeStore } from '../state/metronome.store';
import { PracticeSheet } from './practice-sheet';
import { PracticeStatus } from './practice-status';
import { RestCounter } from './rest-counter';
import { TimeSignatureSheet } from './time-signature-sheet';

let store: InstanceType<typeof MetronomeStore>;
let driver: MetronomeDriver;

beforeEach(() => {
  localStorage.clear();
  TestBed.resetTestingModule();
  driver = new MetronomeDriver();
  store = TestBed.inject(MetronomeStore);
});

afterEach(() => {
  store.stop();
});

const press = (element: Element, label: string): void => {
  const button = byLabel(element, label);
  pointer(button, 'pointerdown', { button: 0 });
  pointer(button, 'pointerup');
};

describe('PracticeSheet', () => {
  it('says how many tools are on and turns them all off', async () => {
    const { fixture, element } = await render(PracticeSheet);
    expect(element.querySelector('[role="status"]')).toBeNull();
    store.editablePractice.update((practice) => ({
      ...practice,
      polyrhythm: '3:2',
      speedTrainer: { ...practice.speedTrainer, enabled: true },
    }));
    TestBed.tick();
    await fixture.whenStable();
    const status = element.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('2 tools on');
    await click(fixture, status.querySelector('button')!);
    expect(store.activePractice()).toEqual([]);
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('switches the gap click on and edits its bars', async () => {
    const { fixture, element } = await render(PracticeSheet);
    const playBars = element.querySelector('[aria-label="Play bars"]')!;
    expect(playBars.getAttribute('aria-disabled')).toBe('true');
    await click(fixture, byLabel(element, 'Gap click', '[role="switch"]'));
    TestBed.tick();
    expect(store.practice().gapClick.enabled).toBe(true);
    await fixture.whenStable();
    expect(playBars.getAttribute('aria-disabled')).toBeNull();
    press(playBars, 'Plus 1');
    TestBed.tick();
    expect(store.practice().gapClick.play).toBe(3);
  });

  it('keeps gap bars within 1 to 16', async () => {
    const { fixture, element } = await render(PracticeSheet);
    await click(fixture, byLabel(element, 'Gap click', '[role="switch"]'));
    const muteBars = element.querySelector('[aria-label="Mute bars"]')!;
    expect(muteBars.getAttribute('aria-valuemin')).toBe('1');
    expect(muteBars.getAttribute('aria-valuemax')).toBe('16');
    key(muteBars, 'PageDown');
    TestBed.tick();
    expect(store.practice().gapClick.mute).toBe(1);
  });

  it('picks a polyrhythm', async () => {
    const { fixture, element } = await render(PracticeSheet);
    await click(fixture, byLabel(element, '4:3', '[role="radio"]'));
    TestBed.tick();
    expect(store.practice().polyrhythm).toBe('4:3');
    await click(fixture, byLabel(element, 'Off', '[role="radio"]'));
    TestBed.tick();
    expect(store.practice().polyrhythm).toBe('off');
  });

  it('sets up the speed trainer and mentions the start tempo', async () => {
    store.setBpm(96);
    const { fixture, element } = await render(PracticeSheet);
    expect(element.textContent).toContain('Starts at the metronome tempo (96 BPM)');
    await click(fixture, byLabel(element, 'Speed trainer', '[role="switch"]'));
    press(element.querySelector('[aria-label="Target BPM"]')!, 'Plus 10');
    press(element.querySelector('[aria-label="Raise by"]')!, 'Minus 1');
    press(element.querySelector('[aria-label="Every"]')!, 'Plus 1');
    TestBed.tick();
    expect(store.practice().speedTrainer).toEqual({
      enabled: true,
      step: 3,
      everyBars: 5,
      target: 170,
    });
  });

  it('starts the rest counter with the chosen bars and closes', async () => {
    const { fixture, element } = await render(PracticeSheet);
    press(element.querySelector('[aria-label="Bars tacet"]')!, 'Plus 10');
    await click(fixture, byLabel(element, 'Click audible', '[role="switch"]'));
    TestBed.tick();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    await click(fixture, byLabel(element, 'Start counting'));
    expect(closed).toBe(true);
    expect(store.rest()).toEqual({ bars: 18, audible: true, finished: false });
  });
});

describe('PracticeStatus', () => {
  it('shows nothing while every tool is off', async () => {
    const { element } = await render(PracticeStatus);
    expect(element.querySelector('button')).toBeNull();
  });

  it('shows a chip per active tool and opens the sheet', async () => {
    store.editablePractice.update((practice) => ({
      ...practice,
      gapClick: { enabled: true, play: 2, mute: 1 },
      polyrhythm: '3:2',
      speedTrainer: { enabled: true, step: 4, everyBars: 4, target: 160 },
    }));
    TestBed.tick();
    const { fixture, element } = await render(PracticeStatus);
    const chips = [...element.querySelectorAll('[aria-haspopup="dialog"]')].map((chip) =>
      chip.textContent.trim(),
    );
    expect(chips).toEqual(['Gap 2 on · 1 off', 'Poly 3:2', '+4 every 4 bars → 160']);
    let opened = false;
    fixture.componentInstance.open.subscribe(() => (opened = true));
    await click(fixture, element.querySelector('button')!);
    expect(opened).toBe(true);
  });

  it('turns one tool off, or all of them, keeping their settings', async () => {
    store.editablePractice.update((practice) => ({
      ...practice,
      gapClick: { enabled: true, play: 3, mute: 1 },
      polyrhythm: '4:3',
      speedTrainer: { enabled: true, step: 4, everyBars: 4, target: 160 },
    }));
    TestBed.tick();
    const { fixture, element } = await render(PracticeStatus);
    await click(fixture, byLabel(element, 'Turn off polyrhythm'));
    expect(store.practice().polyrhythm).toBe('off');
    expect(store.activePractice()).toEqual(['gapClick', 'speedTrainer']);
    await click(
      fixture,
      [...element.querySelectorAll('button')].find((b) => b.textContent.includes('Turn all off'))!,
    );
    expect(store.activePractice()).toEqual([]);
    expect(store.practice().gapClick).toEqual({ enabled: false, play: 3, mute: 1 });
    expect(element.querySelector('button')).toBeNull();
  });

  it('offers "Turn all off" only with more than one tool on', async () => {
    store.editablePractice.update((practice) => ({ ...practice, polyrhythm: '3:2' }));
    TestBed.tick();
    const { element } = await render(PracticeStatus);
    expect(element.textContent).not.toContain('Turn all off');
    expect(byLabel(element, 'Turn off polyrhythm')).toBeTruthy();
  });

  it('shows live state while playing', async () => {
    store.setBpm(100);
    store.editablePractice.update((practice) => ({
      ...practice,
      gapClick: { enabled: true, play: 1, mute: 1 },
      speedTrainer: { enabled: true, step: 10, everyBars: 1, target: 160 },
    }));
    TestBed.tick();
    const { fixture, element } = await render(PracticeStatus);
    store.toggle();
    await driver.settle();
    driver.playUntil(2.5);
    await fixture.whenStable();
    expect(element.textContent).toContain('Silent · keep time');
    expect(element.textContent).toContain('Trainer · now 110 → 160');
  });
});

describe('RestCounter', () => {
  it('counts bars with how many are left', async () => {
    store.startRest(3, false);
    await driver.settle();
    const { fixture, element } = await render(RestCounter);
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Rest counter');
    expect(dialog.textContent).toContain('120 BPM · 4/4');
    expect(dialog.textContent).toMatch(/1\s*of 3/);
    // Bars left after the one that is playing.
    expect(dialog.textContent).toContain('2 to go');
    driver.playUntil(2.1);
    await fixture.whenStable();
    expect(dialog.textContent).toMatch(/2\s*of 3/);
    expect(dialog.textContent).toContain('1 to go');
    expect(dialog.querySelectorAll('[aria-hidden="true"] span.bg-accent')).toHaveLength(1);
  });

  it('shows one dot per count when counting in groups', async () => {
    store.setTimeSignature({ beats: 11, unit: 8 });
    store.setGrouping([3, 3, 3, 2]);
    store.setPulse('group');
    store.startRest(3, false);
    await driver.settle();
    const { element } = await render(RestCounter);
    expect(element.querySelectorAll('[aria-hidden="true"] span')).toHaveLength(4);
  });

  it('signals the entrance and closes with Done', async () => {
    store.startRest(1, false);
    await driver.settle();
    const { fixture, element } = await render(RestCounter);
    driver.playUntil(2.1);
    await fixture.whenStable();
    expect(element.textContent).toContain('Play!');
    expect(element.textContent).toContain('1 bars done');
    await click(fixture, byLabel(element, 'Done'));
    expect(store.rest()).toBeNull();
  });

  it('restarts the count', async () => {
    store.startRest(4, true);
    await driver.settle();
    const { fixture, element } = await render(RestCounter);
    driver.playUntil(2.1);
    await click(fixture, byLabel(element, 'Restart'));
    await driver.settle();
    expect(store.currentBar()).toBe(0);
    expect(store.rest()).toEqual({ bars: 4, audible: true, finished: false });
  });

  it('ends from the close button and from Escape', async () => {
    store.startRest(4, false);
    await driver.settle();
    const { fixture, element } = await render(RestCounter);
    await click(fixture, byLabel(element, 'Close'));
    expect(store.rest()).toBeNull();

    store.startRest(4, false);
    await fixture.whenStable();
    const cancel = new Event('cancel', { cancelable: true });
    element.querySelector('dialog')!.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(store.rest()).toBeNull();
    expect(store.isPlaying()).toBe(false);
  });
});

describe('TimeSignatureSheet', () => {
  it('starts from the current meter and applies a new one', async () => {
    const { fixture, element } = await render(TimeSignatureSheet);
    expect(element.textContent).toContain('4/4');
    press(element.querySelector('[aria-label="Beats per bar"]')!, 'Plus 1');
    await click(fixture, byLabel(element, '8', '[role="radio"]'));
    expect(element.textContent).toContain('5/8');
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    await click(fixture, byLabel(element, 'Use 5/8'));
    expect(store.timeSignature()).toEqual({ beats: 5, unit: 8 });
    expect(store.grouping()).toEqual([3, 2]);
    expect(closed).toBe(true);
  });

  it('keeps beats within 1 to 16 and changes nothing on Cancel', async () => {
    const { fixture, element } = await render(TimeSignatureSheet);
    const beats = element.querySelector('[aria-label="Beats per bar"]')!;
    expect(beats.getAttribute('aria-valuemax')).toBe('16');
    for (let i = 0; i < 20; i++) key(beats, 'ArrowUp');
    await fixture.whenStable();
    expect(element.textContent).toContain('16/4');
    await click(fixture, byLabel(element, 'Cancel'));
    expect(store.timeSignature()).toEqual({ beats: 4, unit: 4 });
  });
});
