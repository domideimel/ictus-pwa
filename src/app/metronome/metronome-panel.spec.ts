import { TestBed } from '@angular/core/testing';
import { byLabel, click, render } from '../../testing/dom';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { defaultLevels } from '../music/meter';
import { LibraryStore } from '../state/library.store';
import { MetronomeStore } from '../state/metronome.store';
import { MetronomePanel } from './metronome-panel';

const resize = (width: number, height: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
};

describe('MetronomePanel', () => {
  let store: InstanceType<typeof MetronomeStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    resize(390, 844);
    new MetronomeDriver();
    store = TestBed.inject(MetronomeStore);
  });

  afterEach(() => {
    store.stop();
  });

  it('shows the phone layout with marking, meter and current tempo', async () => {
    const { element } = await render(MetronomePanel);
    expect(element.querySelector('h1')?.textContent).toBe('Allegro');
    const meter = byLabel(element, 'Current meter and tempo', '[role="group"]');
    expect(meter.textContent.replace(/\s+/g, ' ').trim()).toBe('4/4♩ · 120');
    expect(element.querySelector('section')).toBeNull();
  });

  it('taps the tempo', async () => {
    const { fixture, element } = await render(MetronomePanel);
    const tap = byLabel(element, 'Tap tempo');
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(750);
    await click(fixture, tap);
    await click(fixture, tap);
    expect(store.bpm()).toBe(80);
    vi.restoreAllMocks();
  });

  it('badges the practice button with the number of tools on', async () => {
    const { fixture, element } = await render(MetronomePanel);
    store.editablePractice.update((practice) => ({ ...practice, polyrhythm: '3:2' }));
    TestBed.tick();
    await fixture.whenStable();
    const button = byLabel(element, 'Practice tools, 1 on');
    expect(button.textContent.trim()).toBe('1');
    store.turnOffPractice();
    await fixture.whenStable();
    expect(byLabel(element, 'Practice tools')).toBeTruthy();
  });

  it('opens the practice and setlist sheets from the header', async () => {
    const { fixture, element } = await render(MetronomePanel);
    await click(fixture, byLabel(element, 'Practice tools'));
    expect(element.querySelector('app-practice-sheet dialog[open]')).not.toBeNull();
    await click(fixture, byLabel(element.querySelector('app-practice-sheet')!, 'Close'));
    expect(element.querySelector('app-practice-sheet')).toBeNull();

    await click(fixture, byLabel(element, 'Setlists'));
    expect(element.querySelector('app-setlist-sheet dialog[open]')).not.toBeNull();
  });

  it('shows the swing slider only for eighths and sixteenths', async () => {
    const { fixture, element } = await render(MetronomePanel);
    expect(element.querySelector('app-swing-slider')).toBeNull();
    store.setSubdivision(2);
    await fixture.whenStable();
    expect(element.querySelector('app-swing-slider')).not.toBeNull();
  });

  it('shrinks the dial to make room for optional rows', async () => {
    resize(390, 1100);
    const { fixture, element } = await render(MetronomePanel);
    const dial = (): string => (element.querySelector('app-tempo-dial') as HTMLElement).style.width;
    expect(dial()).toBe('248px');

    store.setTimeSignature({ beats: 7, unit: 8 });
    store.setSubdivision(2);
    store.editablePractice.update((practice) => ({ ...practice, polyrhythm: '3:2' }));
    const library = TestBed.inject(LibraryStore);
    const list = library.addSetlist('Concert');
    const piece = library.addPiece(list.id, 'One', { ...store.setup(), levels: defaultLevels(7) });
    library.setActivePiece({ setlistId: list.id, pieceId: piece.id });
    TestBed.tick();
    await fixture.whenStable();
    // Setlist bar, practice chips, grouping chips with the count toggle, and swing slider.
    expect(dial()).toBe(`${1100 - 640 - 52 - 44 - 84 - 44}px`);

    resize(390, 600);
    TestBed.resetTestingModule();
    new MetronomeDriver();
    const small = await render(MetronomePanel);
    expect((small.element.querySelector('app-tempo-dial') as HTMLElement).style.width).toBe(
      '140px',
    );
  });

  it('has a card layout on wide screens', async () => {
    resize(1280, 900);
    const fixture = TestBed.createComponent(MetronomePanel);
    fixture.componentRef.setInput('wide', true);
    await fixture.whenStable();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.getAttribute('aria-labelledby')).toBe('metronome-title');
    expect(section.textContent).toContain('Beats · tap to accent');
    expect((section.querySelector('app-tempo-dial') as HTMLElement).style.width).toBe('240px');
    await click(fixture, byLabel(section, 'Tap tempo'));
    await click(fixture, byLabel(section, 'Practice tools'));
    expect(fixture.nativeElement.querySelector('app-practice-sheet')).not.toBeNull();
    await click(fixture, byLabel(section, 'Setlists'));
    expect(fixture.nativeElement.querySelector('app-setlist-sheet')).not.toBeNull();
  });
});
