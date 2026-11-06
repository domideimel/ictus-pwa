import { TestBed } from '@angular/core/testing';
import { byLabel, click, key, pointer, render } from '../../testing/dom';
import { SettingsStore } from '../state/settings.store';
import { SettingsSheet } from './settings-sheet';

describe('SettingsSheet', () => {
  let settings: InstanceType<typeof SettingsStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    settings = TestBed.inject(SettingsStore);
  });

  const setup = async () => {
    const result = await render(SettingsSheet);
    const changed = async (): Promise<void> => {
      TestBed.tick();
      await result.fixture.whenStable();
    };
    return { ...result, changed };
  };

  it('groups settings into Tuner, Metronome and General', async () => {
    const { element } = await setup();
    expect([...element.querySelectorAll('h3')].map((title) => title.textContent)).toEqual([
      'Tuner',
      'Metronome',
      'General',
    ]);
  });

  it('edits the reference pitch within 430–450 Hz', async () => {
    const { element, changed } = await setup();
    const pitch = element.querySelector('[aria-label="Reference pitch"]')!;
    expect(pitch.getAttribute('aria-valuetext')).toBe('442 Hz');
    expect(pitch.getAttribute('aria-valuemin')).toBe('430');
    expect(pitch.getAttribute('aria-valuemax')).toBe('450');
    pointer(byLabel(pitch, 'Minus 1'), 'pointerdown', { button: 0 });
    await changed();
    expect(settings.referencePitch()).toBe(441);
    for (let i = 0; i < 30; i++) key(pitch, 'ArrowUp');
    await changed();
    expect(settings.referencePitch()).toBe(450);
  });

  it('picks tolerance, clef and accidentals', async () => {
    const { fixture, element, changed } = await setup();
    await click(fixture, byLabel(element, '±10 ¢', '[role="radio"]'));
    await click(fixture, byLabel(element, 'Treble', '[role="radio"]'));
    await click(fixture, byLabel(element, '♯ Sharps', '[role="radio"]'));
    await changed();
    expect(settings.tolerance()).toBe(10);
    expect(settings.clef()).toBe('treble');
    expect(settings.accidentals()).toBe('sharps');
  });

  // jsdom does not route a scripted <select> change through signal forms; picking an option in a
  // real browser saves it (checked in Chromium). Here the select must mirror the stored setting.
  it('shows the click sound and pedal mode from the settings', async () => {
    const { element, changed } = await setup();
    const sound = element.querySelector('select[aria-label="Click sound"]') as HTMLSelectElement;
    const pedal = element.querySelector('select[aria-label="Pedal"]') as HTMLSelectElement;
    expect([...sound.options].map((option) => option.textContent?.trim())).toEqual([
      'Click',
      'Woodblock',
      'Cowbell',
    ]);
    expect([...pedal.options].map((option) => option.textContent?.trim())).toEqual([
      'Tap · Start/Stop',
      'Previous · Next piece',
    ]);
    expect([sound.value, pedal.value]).toEqual(['click', 'tapAndStartStop']);
    settings.update({ clickSound: 'cowbell', pedalMode: 'previousAndNext' });
    await changed();
    expect([sound.value, pedal.value]).toEqual(['cowbell', 'previousAndNext']);
  });

  it('has a volume slider per voice, including the polyrhythm', async () => {
    const { element, changed } = await setup();
    const sliders = [...element.querySelectorAll('input[type="range"]')] as HTMLInputElement[];
    expect(sliders.map((slider) => slider.closest('label')?.textContent?.trim())).toEqual([
      'Accent',
      'Beat',
      'Subdivision',
      'Polyrhythm',
    ]);
    expect(sliders.map((slider) => [slider.min, slider.max])).toEqual(Array(4).fill(['0', '1']));
    sliders[3].value = '0.25';
    sliders[3].dispatchEvent(new Event('input'));
    await changed();
    expect(settings.polyVolume()).toBe(0.25);
  });

  it('toggles vibration and keep awake', async () => {
    const { fixture, element, changed } = await setup();
    await click(fixture, byLabel(element, 'Vibration', '[role="switch"]'));
    await click(fixture, byLabel(element, 'Keep screen awake', '[role="switch"]'));
    await changed();
    expect(settings.vibration()).toBe(false);
    expect(settings.keepAwake()).toBe(false);
  });

  it('explains the pedals and keys', async () => {
    const { element } = await setup();
    expect(element.textContent).toContain('Space always starts and stops, T taps the tempo.');
  });

  it('emits closed when dismissed', async () => {
    const { fixture, element } = await setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    await click(fixture, byLabel(element, 'Close'));
    expect(closed).toBe(true);
  });
});
