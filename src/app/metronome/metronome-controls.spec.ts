import { TestBed } from '@angular/core/testing';
import {
  byLabel,
  click,
  key,
  pointer,
  queryAllText,
  radio,
  radioNames,
  render,
} from '../../testing/dom';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { BeatLevel } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import { BeatDots } from './beat-dots';
import { NudgeButtons } from './nudge-buttons';
import { PlayButton } from './play-button';
import { SubdivisionPicker } from './subdivision-picker';
import { SwingSlider } from './swing-slider';
import { TempoDial } from './tempo-dial';
import { TimeSignatureChips } from './time-signature-chips';

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

describe('TempoDial', () => {
  it('is a slider announcing tempo and marking', async () => {
    const { element } = await render(TempoDial);
    expect(element.getAttribute('role')).toBe('slider');
    expect(element.getAttribute('aria-valuenow')).toBe('120');
    expect(element.getAttribute('aria-valuemin')).toBe('20');
    expect(element.getAttribute('aria-valuemax')).toBe('300');
    expect(element.getAttribute('aria-valuetext')).toBe('120 BPM, quarter notes, Allegro');
    expect(element.textContent).toContain('120');
  });

  it('nudges with arrow and page keys', async () => {
    const { element } = await render(TempoDial);
    key(element, 'ArrowUp');
    key(element, 'ArrowRight');
    expect(store.bpm()).toBe(122);
    key(element, 'ArrowDown');
    expect(store.bpm()).toBe(121);
    key(element, 'ArrowLeft');
    key(element, 'PageUp');
    expect(store.bpm()).toBe(130);
    key(element, 'PageDown');
    expect(store.bpm()).toBe(120);
    expect(key(element, 'Enter').defaultPrevented).toBe(false);
  });

  it('jumps to the ends of the range with Home and End', async () => {
    const { element } = await render(TempoDial);
    expect(key(element, 'End').defaultPrevented).toBe(true);
    expect(store.bpm()).toBe(300);
    key(element, 'Home');
    expect(store.bpm()).toBe(20);
  });

  it('changes the tempo by dragging around the centre', async () => {
    const { element } = await render(TempoDial);
    // jsdom lays everything out at 0 × 0, so the centre is the origin.
    pointer(element, 'pointerdown', { clientX: 100, clientY: 0 });
    pointer(element, 'pointermove', { clientX: 0, clientY: 100 });
    expect(store.bpm()).toBe(Math.round(120 + (90 / 270) * 280));
    pointer(element, 'pointermove', { clientX: 100, clientY: 0 });
    expect(store.bpm()).toBe(120);
    pointer(element, 'pointerup');
    pointer(element, 'pointermove', { clientX: 0, clientY: 100 });
    expect(store.bpm()).toBe(120);
  });

  it('crosses the left side without jumping and stops at the ends', async () => {
    const { element } = await render(TempoDial);
    pointer(element, 'pointerdown', { clientX: -100, clientY: -1 });
    pointer(element, 'pointermove', { clientX: -100, clientY: 1 });
    expect(Math.abs(store.bpm() - 120)).toBeLessThanOrEqual(1);
    for (let i = 0; i < 8; i++) {
      pointer(element, 'pointermove', { clientX: 0, clientY: -100 });
      pointer(element, 'pointermove', { clientX: 100, clientY: 0 });
      pointer(element, 'pointermove', { clientX: 0, clientY: 100 });
      pointer(element, 'pointermove', { clientX: -100, clientY: 1 });
    }
    expect(store.bpm()).toBe(300);
    pointer(element, 'pointercancel');
  });

  it('draws the arc for the tempo', async () => {
    const { fixture, element } = await render(TempoDial);
    const fill = () => element.querySelectorAll('circle')[1]!.getAttribute('stroke-dasharray')!;
    store.setBpm(20);
    await fixture.whenStable();
    expect(fill().startsWith('0 ')).toBe(true);
    store.setBpm(300);
    await fixture.whenStable();
    const [filled, ,] = fill().split(' ').map(Number);
    const track = Number(
      element.querySelectorAll('circle')[0]!.getAttribute('stroke-dasharray')!.split(' ')[0],
    );
    expect(filled).toBeCloseTo(track, 6);
  });
});

describe('BeatDots', () => {
  it('labels each beat with its level and cycles it on tap', async () => {
    const { fixture, element } = await render(BeatDots);
    expect(queryAllText(element, 'button')).toEqual(['1', '2', '3', '4']);
    expect(byLabel(element, 'Beat 1, accent')).toBeTruthy();
    await click(fixture, byLabel(element, 'Beat 2, normal'));
    expect(store.levels()[1]).toBe(BeatLevel.Mute);
    expect(byLabel(element, 'Beat 2, muted')).toBeTruthy();
  });

  it('lights the beat that is playing', async () => {
    const { fixture, element } = await render(BeatDots);
    store.toggle();
    await driver.settle();
    driver.playUntil(0.6);
    await fixture.whenStable();
    const second = byLabel(element, 'Beat 2, normal');
    expect(second.querySelector('span')?.className).toContain('bg-lg-accent');
    // The label stays put, so a focused dot is not announced again on every beat.
    expect(element.querySelector('[aria-label*="playing"]')).toBeNull();
  });

  it('draws long counts wider when counting uneven groups', async () => {
    store.setTimeSignature({ beats: 7, unit: 8 });
    store.setPulse('group');
    const { element } = await render(BeatDots);
    expect(byLabel(element, 'Beat 3, dotted quarter, normal')).toBeTruthy();
    const widths = [...element.querySelectorAll('button > span:first-child')].map(
      (dot) => (dot as HTMLElement).style.width,
    );
    expect(widths).toEqual(['52px', '52px', '78px']);
  });

  it('marks group starts and wraps after eight beats', async () => {
    store.setTimeSignature({ beats: 12, unit: 8 });
    const { element } = await render(BeatDots);
    const rows = element.querySelectorAll(':scope > div');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.querySelectorAll('button')).toHaveLength(8);
    const marks = [...element.querySelectorAll('button')].map((button) =>
      button.querySelector('span:last-child')!.classList.contains('bg-lg-accent'),
    );
    expect(marks.flatMap((marked, index) => (marked ? [index] : []))).toEqual([3, 6, 9]);
  });

  it('shrinks the dots for long bars', async () => {
    const size = async (beats: number): Promise<string> => {
      store.setTimeSignature({ beats, unit: 4 });
      const { element } = await render(BeatDots);
      return (element.querySelector('button span') as HTMLElement).style.width;
    };
    expect(await size(5)).toBe('52px');
    expect(await size(7)).toBe('42px');
    expect(await size(9)).toBe('36px');
  });
});

describe('NudgeButtons', () => {
  it('nudges by −5, −1, +1 and +5', async () => {
    const { fixture, element } = await render(NudgeButtons);
    expect(queryAllText(element, 'button')).toEqual(['−5', '−1', '+1', '+5']);
    await click(fixture, byLabel(element, 'Plus 5 BPM'));
    await click(fixture, byLabel(element, 'Plus 1 BPM'));
    expect(store.bpm()).toBe(126);
    await click(fixture, byLabel(element, 'Minus 5 BPM'));
    await click(fixture, byLabel(element, 'Minus 1 BPM'));
    expect(store.bpm()).toBe(120);
  });
});

describe('PlayButton', () => {
  it('starts and stops the metronome and says what it will do', async () => {
    const { fixture, element } = await render(PlayButton);
    await click(fixture, byLabel(element, 'Start metronome'));
    await driver.settle();
    expect(store.isPlaying()).toBe(true);
    await fixture.whenStable();
    await click(fixture, byLabel(element, 'Stop metronome'));
    expect(store.isPlaying()).toBe(false);
  });

  it('takes its size from the input', async () => {
    const fixture = TestBed.createComponent(PlayButton);
    fixture.componentRef.setInput('size', 112);
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('button') as HTMLElement).style.width).toBe(
      '112px',
    );
  });
});

describe('SubdivisionPicker', () => {
  it('is a fieldset of native radios for the six subdivisions', async () => {
    const { fixture, element } = await render(SubdivisionPicker);
    expect(element.querySelector('legend')?.textContent.trim()).toBe('Subdivision');
    // The note symbols are decorative; each radio is named by its title.
    expect(radioNames(element)).toEqual([
      'Quarter',
      'Eighth',
      'Triplet',
      '16th',
      'Quintuplet',
      'Sextuplet',
    ]);
    await click(fixture, radio(element, 'Triplet'));
    expect(store.subdivision()).toBe(3);
    expect(radio(element, 'Triplet').checked).toBe(true);
    expect(radio(element, 'Quarter').checked).toBe(false);
  });

  it('shares one radio name, so the arrows move the selection as in any radio group', async () => {
    const { element } = await render(SubdivisionPicker);
    const names = new Set(
      [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((r) => r.name),
    );
    expect(names.size).toBe(1);
    store.setSubdivision(6);
    TestBed.tick();
    expect(radio(element, 'Sextuplet').checked).toBe(true);
  });

  it('lays out in three columns when horizontal', async () => {
    const fixture = TestBed.createComponent(SubdivisionPicker);
    fixture.componentRef.setInput('horizontal', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('fieldset').className).toContain('grid-cols-3');
  });
});

describe('SwingSlider', () => {
  it('sets swing and describes it', async () => {
    const { fixture, element } = await render(SwingSlider);
    const slider = element.querySelector('input') as HTMLInputElement;
    expect(slider.getAttribute('aria-label')).toBe('Swing');
    expect(slider.getAttribute('aria-valuetext')).toBe('Straight');
    slider.value = '0.67';
    slider.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(store.swing()).toBe(0.67);
    expect(slider.getAttribute('aria-valuetext')).toBe('Triplet');
    slider.value = '0.72';
    slider.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(slider.getAttribute('aria-valuetext')).toBe('72 %');
  });
});

describe('TimeSignatureChips', () => {
  const group = (element: HTMLElement, legend: string): HTMLFieldSetElement => {
    const found = [...element.querySelectorAll('fieldset')].find(
      (fieldset) => fieldset.querySelector('legend')?.textContent.trim() === legend,
    );
    if (!found) throw new Error(`No ${legend} group`);
    return found;
  };

  it('selects quick picks as a radio group', async () => {
    const { fixture, element } = await render(TimeSignatureChips);
    const picks = group(element, 'Time signature');
    expect(radio(picks, '4/4').checked).toBe(true);
    await click(fixture, radio(picks, '3/4'));
    expect(store.timeSignature()).toEqual({ beats: 3, unit: 4 });
    expect(radio(picks, '3/4').checked).toBe(true);
    expect(radio(picks, '4/4').checked).toBe(false);
  });

  it('offers groupings for odd meters', async () => {
    const { fixture, element } = await render(TimeSignatureChips);
    expect(() => group(element, 'Grouping')).toThrow();
    await click(fixture, radio(element, '7/8'));
    const groupings = group(element, 'Grouping');
    expect(radioNames(groupings)).toEqual(['2+2+3', '2+3+2', '3+2+2']);
    await click(fixture, radio(groupings, '3+2+2'));
    expect(store.grouping()).toEqual([3, 2, 2]);
    expect(radio(groupings, '3+2+2').checked).toBe(true);
  });

  it('counts odd meters in notes or in groups', async () => {
    store.setTimeSignature({ beats: 11, unit: 8 });
    const { fixture, element } = await render(TimeSignatureChips);
    const count = group(element, 'Count');
    expect(radioNames(count)).toEqual(['Eighths · 11', 'Groups · 4']);
    await click(fixture, radio(count, 'Groups · 4'));
    expect(store.pulse()).toBe('group');
    expect(store.levels()).toHaveLength(4);
  });

  it('shows a custom meter on the More chip and opens the sheet', async () => {
    store.setTimeSignature({ beats: 11, unit: 16 });
    const { fixture, element } = await render(TimeSignatureChips);
    expect(byLabel(element, '11/16 ⋯')).toBeTruthy();
    await click(fixture, byLabel(element, '11/16 ⋯'));
    expect(element.querySelector('app-time-signature-sheet dialog[open]')).not.toBeNull();
  });

  it('wraps on wide screens', async () => {
    const fixture = TestBed.createComponent(TimeSignatureChips);
    fixture.componentRef.setInput('wraps', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('div').className).toContain('flex-wrap');
    // One line of tighter segments across the card instead of a scrolling row.
    expect(fixture.nativeElement.querySelector('fieldset').className).toContain('w-full');
    expect(fixture.nativeElement.querySelector('label').className).toContain('flex-1');
  });
});
