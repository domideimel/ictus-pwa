import { TestBed } from '@angular/core/testing';
import {
  byLabel,
  click,
  control,
  key,
  pressStep,
  radio,
  render,
  selectControl,
} from '../../testing/dom';
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

  it('groups settings into Appearance, Tuner, Metronome and General', async () => {
    const { element } = await setup();
    expect([...element.querySelectorAll('h3')].map((title) => title.textContent.trim())).toEqual([
      'Appearance',
      'Tuner',
      'Metronome',
      'General',
    ]);
  });

  it('edits the reference pitch within 430–450 Hz', async () => {
    const { element, changed } = await setup();
    const pitch = control(element, 'Reference pitch');
    expect(pitch.getAttribute('role')).toBe('spinbutton');
    expect(pitch.getAttribute('aria-valuetext')).toBe('442 Hz');
    expect(pitch.getAttribute('aria-valuemin')).toBe('430');
    expect(pitch.getAttribute('aria-valuemax')).toBe('450');
    pressStep(pitch, 'decrease');
    await changed();
    expect(settings.referencePitch()).toBe(441);
    for (let i = 0; i < 30; i++) key(pitch, 'ArrowUp');
    await changed();
    expect(settings.referencePitch()).toBe(450);
  });

  it('picks tolerance, clef and accidentals', async () => {
    const { fixture, element, changed } = await setup();
    await click(fixture, radio(element, '±10 ¢'));
    await click(fixture, radio(element, 'Treble'));
    await click(fixture, radio(element, '♯ Sharps'));
    await changed();
    expect(settings.tolerance()).toBe(10);
    expect(settings.clef()).toBe('treble');
    expect(settings.accidentals()).toBe('sharps');
  });

  // jsdom does not route a scripted <select> change through signal forms; picking an option in a
  // real browser saves it (checked in Chromium). Here the select must mirror the stored setting.
  it('shows the click sound and pedal mode from the settings', async () => {
    const { element, changed } = await setup();
    const sound = selectControl(element, 'Click sound');
    const pedal = selectControl(element, 'Pedal');
    expect([...sound.options].map((option) => option.textContent.trim())).toEqual([
      'Click',
      'Woodblock',
      'Cowbell',
    ]);
    expect([...pedal.options].map((option) => option.textContent.trim())).toEqual([
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
    expect(sliders.map((slider) => slider.closest('label')?.textContent.trim())).toEqual([
      'Accent',
      'Beat',
      'Subdivision',
      'Polyrhythm',
    ]);
    expect(sliders.map((slider) => [slider.min, slider.max])).toEqual(Array(4).fill(['0', '1']));
    sliders[3]!.value = '0.25';
    sliders[3]!.dispatchEvent(new Event('input'));
    await changed();
    expect(settings.polyVolume()).toBe(0.25);
  });

  it('toggles vibration and keep awake', async () => {
    const { fixture, element, changed } = await setup();
    const vibration = control(element, 'Vibration');
    const awake = control(element, 'Keep screen awake');
    // Native checkboxes with the switch role, so screen readers announce on and off.
    expect([vibration.type, vibration.getAttribute('role'), vibration.checked]).toEqual([
      'checkbox',
      'switch',
      true,
    ]);
    await click(fixture, vibration);
    await click(fixture, awake);
    await changed();
    expect(settings.vibration()).toBe(false);
    expect(settings.keepAwake()).toBe(false);
  });

  it('picks light, dark or the system colours', async () => {
    const { fixture, element } = await setup();
    const switcher = element.querySelector('lg-theme-switcher')!;
    expect(radio(switcher, 'System').checked).toBe(true);
    await click(fixture, radio(switcher, 'Dark'));
    expect(document.documentElement.dataset['theme']).toBe('dark');
    await click(fixture, radio(switcher, 'System'));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
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
