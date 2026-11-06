import { TestBed } from '@angular/core/testing';
import { byLabel, click, pointer, render } from '../../testing/dom';
import { stubGetUserMedia } from '../../testing/fakes';
import { TunerDriver } from '../../testing/tuner-driver';
import { MetronomeStore } from '../state/metronome.store';
import { SettingsStore } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';
import { DrumTuning } from './drum-tuning';
import { ReferencePitchButton } from './reference-pitch';
import { StaffCard } from './staff-card';
import { TunerPanel, TunerToggle } from './tuner-panel';
import { CentsMeter, FrequencyLabel, NoteName, TuningStatePill } from './tuner-readouts';

let driver: TunerDriver;
let settings: InstanceType<typeof SettingsStore>;
let tuner: InstanceType<typeof TunerStore>;

const cents = (base: number, offset: number): number => base * 2 ** (offset / 1200);

beforeEach(() => {
  localStorage.clear();
  TestBed.resetTestingModule();
  driver = new TunerDriver();
  settings = TestBed.inject(SettingsStore);
  tuner = TestBed.inject(TunerStore);
});

afterEach(() => TestBed.inject(MetronomeStore).stop());

describe('NoteName', () => {
  it('shows a dash without a note', async () => {
    const { element } = await render(NoteName);
    expect(element.getAttribute('aria-label')).toBe('No note');
    expect(element.textContent?.trim()).toBe('–');
  });

  it('shows the German name with octave and accidental', async () => {
    const { fixture, element } = await render(NoteName);
    await driver.switchOn();
    driver.hear(cents(442, 100), cents(442, 100));
    await fixture.whenStable();
    expect(element.getAttribute('aria-label')).toBe('B 4');
    settings.update({ accidentals: 'sharps' });
    await fixture.whenStable();
    expect(element.getAttribute('aria-label')).toBe('A♯ 4');
    expect(element.textContent?.replace(/\s+/g, '')).toBe('A♯4');
  });
});

describe('TuningStatePill', () => {
  const text = (element: HTMLElement): string => element.textContent?.trim() ?? '';

  it('walks through off, listening, in tune, high and low', async () => {
    const { fixture, element } = await render(TuningStatePill);
    expect(text(element)).toBe('Tuner off');
    await driver.switchOn();
    await fixture.whenStable();
    expect(text(element)).toBe('Listening…');

    driver.hear(cents(442, 3), cents(442, 3));
    await fixture.whenStable();
    expect(text(element)).toBe('✓ In tune · +3 ¢');
    expect(element.className).toContain('text-in-tune');

    driver.hear(cents(442, 20), cents(442, 20), cents(442, 20));
    await fixture.whenStable();
    expect(text(element)).toBe('▲ High · +20 ¢');

    driver.hear(null, null, cents(442, -12), cents(442, -12));
    await fixture.whenStable();
    expect(text(element)).toBe('▼ Low · −12 ¢');
  });

  it('says 0 for a perfect note', async () => {
    const { fixture, element } = await render(TuningStatePill);
    await driver.switchOn();
    driver.hear(442, 442);
    await fixture.whenStable();
    expect(text(element)).toBe('✓ In tune · 0 ¢');
  });

  it('explains a pause for the click and a denied microphone', async () => {
    const { fixture, element } = await render(TuningStatePill);
    await driver.switchOn();
    TestBed.inject(MetronomeStore).toggle();
    await driver.settle();
    await fixture.whenStable();
    expect(text(element)).toBe('Paused while the click plays');
    TestBed.inject(MetronomeStore).stop();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    tuner.toggle();
    await driver.settle();
    stubGetUserMedia(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    tuner.toggle();
    await driver.settle();
    await fixture.whenStable();
    expect(text(element)).toBe('Microphone access needed');
    warn.mockRestore();
  });
});

describe('CentsMeter and FrequencyLabel', () => {
  it('has no needle or frequency without a reading', async () => {
    const meter = await render(CentsMeter);
    const label = await render(FrequencyLabel);
    expect(meter.element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Cents meter: no reading',
    );
    expect(meter.element.querySelector('g[style]')).toBeNull();
    expect(label.element.textContent?.trim()).toBe('');
  });

  it('moves the needle and shows frequency and target', async () => {
    const meter = await render(CentsMeter);
    const label = await render(FrequencyLabel);
    await driver.switchOn();
    driver.hear(cents(442, 25), cents(442, 25));
    await meter.fixture.whenStable();
    await label.fixture.whenStable();
    expect(meter.element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Cents meter: 25 cents',
    );
    const needle = meter.element.querySelector('g[style]') as SVGGElement;
    expect(needle.style.transform).toBe(`translateX(${20 + (75 / 100) * 440}px)`);
    expect(label.element.textContent?.trim()).toBe(
      `${cents(442, 25).toFixed(2)} Hz · target 442.00 Hz`,
    );
  });

  it('pins the needle at ±50 cents and shades the tolerance band', async () => {
    const meter = await render(CentsMeter);
    const band = (): number => Number(meter.element.querySelector('rect')!.getAttribute('width'));
    expect(band()).toBeCloseTo(44, 6);
    settings.update({ tolerance: 10 });
    await meter.fixture.whenStable();
    expect(band()).toBeCloseTo(88, 6);
  });
});

describe('StaffCard', () => {
  it('shows the bass clef without a note, as set by default', async () => {
    const { element } = await render(StaffCard);
    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe('Bass clef, no note');
    expect(element.textContent).toContain('Bass clef · fixed');
    expect(element.querySelectorAll('line')).toHaveLength(5);
  });

  it('draws the note with accidental, ledger lines and ottava', async () => {
    const { fixture, element } = await render(StaffCard);
    await driver.switchOn();
    // E♭2: below the bass staff with one ledger line.
    driver.hear(cents(442, -3000), cents(442, -3000));
    await fixture.whenStable();
    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'E♭2 on the bass clef staff',
    );
    expect(element.querySelectorAll('line')).toHaveLength(6);
    expect(element.querySelectorAll('text').length).toBe(3);

    // C1 in bass clef needs an 8vb sign.
    driver.hear(null, null, 442 * 2 ** ((24 - 69) / 12), 442 * 2 ** ((24 - 69) / 12));
    await fixture.whenStable();
    expect(element.textContent).toContain('8vb');
  });

  it('picks the clef by pitch in auto mode', async () => {
    settings.update({ clef: 'auto' });
    const { fixture, element } = await render(StaffCard);
    await driver.switchOn();
    driver.hear(442, 442);
    await fixture.whenStable();
    expect(element.textContent).toContain('Treble clef · auto');
    driver.hear(null, null, 110.5, 110.5);
    await fixture.whenStable();
    expect(element.textContent).toContain('Bass clef · auto');
  });
});

describe('TunerToggle', () => {
  it('starts and stops the tuner and stops the click', async () => {
    tuner.setOnScreen(true);
    const metronome = TestBed.inject(MetronomeStore);
    metronome.toggle();
    await driver.settle();
    const { fixture, element } = await render(TunerToggle);
    const button = element.querySelector('button')!;
    expect(button.textContent?.trim()).toBe('Start tuner');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await click(fixture, button);
    await driver.settle();
    expect(metronome.isPlaying()).toBe(false);
    expect(tuner.isListening()).toBe(true);
    expect(button.textContent?.trim()).toBe('Stop tuner');
    await click(fixture, button);
    expect(tuner.switchedOn()).toBe(false);
  });
});

describe('ReferencePitchButton', () => {
  it('shows the reference and edits it in a sheet', async () => {
    const { fixture, element } = await render(ReferencePitchButton);
    const button = byLabel(element, 'Reference pitch A equals 442 hertz, change');
    expect(button.textContent).toContain('A = 442 Hz');
    await click(fixture, button);
    const dialog = element.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(byLabel(dialog, '442').getAttribute('aria-pressed')).toBe('true');

    await click(fixture, byLabel(dialog, '440'));
    expect(settings.referencePitch()).toBe(440);
    pointer(byLabel(dialog.querySelector('app-number-stepper')!, 'Plus 1'), 'pointerdown', {
      button: 0,
    });
    TestBed.tick();
    await fixture.whenStable();
    expect(settings.referencePitch()).toBe(441);
    expect(element.textContent).toContain('A = 441 Hz');

    await click(fixture, byLabel(dialog, 'Close'));
    expect(element.querySelector('dialog')).toBeNull();
  });
});

describe('DrumTuning', () => {
  const lugs = (element: HTMLElement): HTMLButtonElement[] =>
    [...element.querySelectorAll('button[aria-pressed]')] as HTMLButtonElement[];

  it('starts with every lug unmeasured and lug 1 highlighted', async () => {
    const { element } = await render(DrumTuning);
    expect(lugs(element)).toHaveLength(8);
    expect(lugs(element)[0].getAttribute('aria-label')).toBe('Lug 1, not measured');
    expect(lugs(element).map((lug) => lug.getAttribute('aria-pressed'))).toEqual([
      'true',
      ...Array(7).fill('false'),
    ]);
    expect(element.textContent).toContain('Tap in front of lug 1.');
  });

  it('stores strikes lug by lug and gives tuning advice', async () => {
    settings.update({ drumLugs: 4 });
    const { fixture, element } = await render(DrumTuning);
    await driver.switchOn();
    for (const frequency of [200, 200, 200, cents(200, 40)]) {
      driver.strike(frequency);
      await fixture.whenStable();
    }
    // The high lug pulls the average up by 10 ¢, so the other three read 10 ¢ low.
    expect(lugs(element).map((lug) => lug.textContent?.trim())).toEqual([
      '▼10',
      '▼10',
      '▼10',
      '▲30',
    ]);
    expect(element.textContent).toContain('Lug 1: ▼ 10 ¢ low, tighten');
    expect(element.textContent).toContain('Lug 3: ▼ 10 ¢ low, tighten');
    expect(element.textContent).toContain('Lug 4: ▲ 30 ¢ high, loosen');
    expect(element.textContent).toContain('Spread 40 ¢');
    expect(element.textContent).toContain('average');
  });

  it('reports all lugs in tune', async () => {
    settings.update({ drumLugs: 3 });
    const { fixture, element } = await render(DrumTuning);
    await driver.switchOn();
    for (const frequency of [200, cents(200, 2), cents(200, -2)]) {
      driver.strike(frequency);
      await fixture.whenStable();
    }
    expect(element.textContent).toContain('✓ All measured lugs within ±5 ¢');
  });

  it('lets you pick a lug to measure next and clears readings', async () => {
    settings.update({ drumLugs: 4 });
    const { fixture, element } = await render(DrumTuning);
    await click(fixture, lugs(element)[2]);
    expect(lugs(element)[2].getAttribute('aria-pressed')).toBe('true');
    await driver.switchOn();
    driver.strike(150);
    await fixture.whenStable();
    expect(lugs(element)[2].getAttribute('aria-label')).toMatch(/Lug 3, 0 cents/);
    await click(fixture, byLabel(element, 'Clear'));
    expect(lugs(element)[2].getAttribute('aria-label')).toBe('Lug 3, not measured');
    expect(lugs(element)[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('starts over when the lug count changes', async () => {
    const { fixture, element } = await render(DrumTuning);
    pointer(byLabel(element.querySelector('app-number-stepper')!, 'Plus 1'), 'pointerdown', {
      button: 0,
    });
    TestBed.tick();
    await fixture.whenStable();
    expect(settings.drumLugs()).toBe(9);
    expect(lugs(element)).toHaveLength(9);
  });

  it('compares with a target note or a locked average', async () => {
    settings.update({ drumLugs: 3 });
    const { fixture, element } = await render(DrumTuning);
    const select = element.querySelector('#drum-target') as HTMLSelectElement;
    const notes = [...select.querySelectorAll('optgroup option')];
    expect(notes).toHaveLength(37);
    expect(notes[0].textContent?.trim()).toBe('C5 · 525.6 Hz');

    select.value = '57';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(element.textContent).toContain('221.0 Hz');
    expect(element.textContent).toContain('target');
    await driver.switchOn();
    driver.strike(cents(221, -8));
    await fixture.whenStable();
    expect(lugs(element)[0].textContent?.trim()).toBe('▼8');

    select.value = 'average';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    driver.strike(cents(221, 28));
    await fixture.whenStable();
    // Average of −8 ¢ and +28 ¢: 10 ¢ above A3, so not a note of the list.
    const average = cents(221, 10).toFixed(1);
    expect(select.querySelector('option[value="lock"]')?.textContent).toBe(
      `Lock current average (${average} Hz)`,
    );
    select.value = 'lock';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(select.querySelector('option[value="custom"]')?.textContent).toBe(
      `Locked ${average} Hz`,
    );
    expect(select.value).toBe('custom');
    select.value = 'custom';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(select.value).toBe('custom');
  });
});

describe('TunerPanel', () => {
  it('switches between chromatic and drum modes', async () => {
    const { fixture, element } = await render(TunerPanel);
    expect(element.querySelector('app-staff-card')).not.toBeNull();
    await click(fixture, byLabel(element, 'Drum lugs', '[role="radio"]'));
    TestBed.tick();
    await fixture.whenStable();
    expect(settings.tunerMode()).toBe('drum');
    expect(element.querySelector('app-drum-tuning')).not.toBeNull();
    expect(element.querySelector('app-staff-card')).toBeNull();
  });

  it('explains how to allow the microphone after a denial', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, element } = await render(TunerPanel);
    stubGetUserMedia(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    await driver.switchOn();
    await fixture.whenStable();
    expect(element.textContent).toContain('Microphone access is off.');
    warn.mockRestore();
  });

  it('has a card layout on wide screens', async () => {
    const fixture = TestBed.createComponent(TunerPanel);
    fixture.componentRef.setInput('wide', true);
    await fixture.whenStable();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.getAttribute('aria-labelledby')).toBe('tuner-title');
    expect(section.querySelector('app-tuner-toggle')).not.toBeNull();
    await click(fixture, byLabel(section, 'Drum lugs', '[role="radio"]'));
    TestBed.tick();
    await fixture.whenStable();
    expect(section.querySelector('app-drum-tuning')).not.toBeNull();
  });
});
