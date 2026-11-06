import { TestBed } from '@angular/core/testing';
import { byLabel, click, key, pointer, render, queryAllText } from '../../testing/dom';
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
    expect(element.getAttribute('aria-valuetext')).toBe('120 BPM, Allegro');
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
    expect(key(element, 'Home').defaultPrevented).toBe(false);
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
    expect(byLabel(element, 'Beat 2, normal, playing')).toBeTruthy();
  });

  it('marks group starts and wraps after eight beats', async () => {
    store.setTimeSignature({ beats: 12, unit: 8 });
    const { element } = await render(BeatDots);
    const rows = element.querySelectorAll(':scope > div');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.querySelectorAll('button')).toHaveLength(8);
    const marks = [...element.querySelectorAll('button')].map((button) =>
      button.querySelector('span:last-child')!.classList.contains('bg-accent'),
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
  it('is a radio group of the six subdivisions', async () => {
    const { fixture, element } = await render(SubdivisionPicker);
    expect(element.getAttribute('role')).toBe('radiogroup');
    const radios = [...element.querySelectorAll('[role="radio"]')];
    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Quarter',
      'Eighth',
      'Triplet',
      '16th',
      'Quintuplet',
      'Sextuplet',
    ]);
    await click(fixture, byLabel(element, 'Triplet'));
    expect(store.subdivision()).toBe(3);
    expect(byLabel(element, 'Triplet').getAttribute('aria-checked')).toBe('true');
    expect(byLabel(element, 'Quarter').getAttribute('aria-checked')).toBe('false');
  });

  it('lays out in three columns when horizontal', async () => {
    const fixture = TestBed.createComponent(SubdivisionPicker);
    fixture.componentRef.setInput('horizontal', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.className).toContain('grid-cols-3');
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
  it('selects quick picks as toggle chips', async () => {
    const { fixture, element } = await render(TimeSignatureChips);
    expect(byLabel(element, '4/4').getAttribute('aria-pressed')).toBe('true');
    await click(fixture, byLabel(element, '3/4'));
    expect(store.timeSignature()).toEqual({ beats: 3, unit: 4 });
    expect(byLabel(element, '3/4').getAttribute('aria-pressed')).toBe('true');
    expect(byLabel(element, '4/4').getAttribute('aria-pressed')).toBe('false');
  });

  it('offers groupings for odd meters', async () => {
    const { fixture, element } = await render(TimeSignatureChips);
    expect(element.querySelector('[aria-label="Grouping"]')).toBeNull();
    await click(fixture, byLabel(element, '7/8'));
    expect(queryAllText(element, '[aria-label="Grouping"] button')).toEqual([
      '2+2+3',
      '2+3+2',
      '3+2+2',
    ]);
    await click(fixture, byLabel(element, 'Grouping 3 plus 2 plus 2'));
    expect(store.grouping()).toEqual([3, 2, 2]);
    expect(byLabel(element, 'Grouping 3 plus 2 plus 2').getAttribute('aria-pressed')).toBe('true');
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
  });
});
