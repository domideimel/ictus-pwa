import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideServiceWorker } from '@angular/service-worker';
import { axeViolations } from '../testing/axe';
import { byLabel, click } from '../testing/dom';
import { MetronomeDriver } from '../testing/metronome-driver';
import { TunerDriver } from '../testing/tuner-driver';
import { App } from './app';
import { routes } from './app.routes';
import { LibraryStore } from './state/library.store';
import { MetronomeStore } from './state/metronome.store';
import { SettingsStore } from './state/settings.store';

const resize = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
};

/** Every screen and sheet passes axe, on phones and on the combined tablet/desktop layout. */
describe('accessibility (axe)', () => {
  let driver: MetronomeDriver;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    });
    driver = new MetronomeDriver();
  });

  afterEach(() => {
    TestBed.inject(MetronomeStore).stop();
  });

  const start = async (url: string, width = 390) => {
    resize(width);
    const harness = await RouterTestingHarness.create();
    const fixture = TestBed.createComponent(App);
    await harness.navigateByUrl(url);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it.each([
    ['metronome on a phone', '/metronome', 390],
    ['tuner on a phone', '/tuner', 390],
    ['combined view', '/', 1280],
  ])('%s', async (_, url, width) => {
    const { element } = await start(url, width);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('metronome while playing an odd meter counted in groups, with practice tools on', async () => {
    const metronome = TestBed.inject(MetronomeStore);
    metronome.setTimeSignature({ beats: 7, unit: 8 });
    metronome.setPulse('group');
    metronome.editablePractice.update((practice) => ({
      ...practice,
      gapClick: { ...practice.gapClick, enabled: true },
      polyrhythm: '3:2',
    }));
    const { fixture, element } = await start('/metronome');
    metronome.toggle();
    await driver.settle();
    driver.playUntil(0.1);
    await fixture.whenStable();
    expect(await axeViolations(element)).toEqual([]);
  });

  it('tuner while listening, in both modes', async () => {
    const tuner = new TunerDriver();
    const { fixture, element } = await start('/tuner');
    await tuner.switchOn();
    tuner.hear(440, 440);
    await fixture.whenStable();
    expect(await axeViolations(element)).toEqual([]);

    TestBed.inject(SettingsStore).update({ tunerMode: 'drum' });
    await fixture.whenStable();
    tuner.strike(220);
    await fixture.whenStable();
    expect(await axeViolations(element)).toEqual([]);
  });

  it.each([
    ['settings', 'Settings'],
    ['practice tools', 'Practice tools'],
    ['setlists', 'Setlists'],
  ])('%s sheet', async (_, label) => {
    const library = TestBed.inject(LibraryStore);
    const setlist = library.addSetlist('Concert');
    library.addPiece(setlist.id, 'Overture', TestBed.inject(MetronomeStore).setup());
    const { fixture, element } = await start('/metronome');
    await click(fixture, byLabel(element, label));
    expect(await axeViolations(element)).toEqual([]);
  });

  it('time signature and reference pitch sheets', async () => {
    const { fixture, element } = await start('/', 1280);
    await click(fixture, byLabel(element, 'More'));
    expect(await axeViolations(element)).toEqual([]);
    await click(fixture, byLabel(element, 'Cancel'));
    await click(fixture, byLabel(element, /Reference pitch/));
    expect(await axeViolations(element)).toEqual([]);
  });

  it('setlists with nothing saved yet, and the delete confirmation', async () => {
    const { fixture, element } = await start('/metronome');
    await click(fixture, byLabel(element, 'Setlists'));
    expect(await axeViolations(element)).toEqual([]);

    TestBed.inject(LibraryStore).addSetlist('Concert');
    await fixture.whenStable();
    await click(fixture, byLabel(element, 'Edit'));
    await click(fixture, byLabel(element, 'Delete Concert'));
    expect(await axeViolations(element)).toEqual([]);
  });

  it('rest counter', async () => {
    const { fixture, element } = await start('/metronome');
    TestBed.inject(MetronomeStore).startRest(4, false);
    await driver.settle();
    await fixture.whenStable();
    expect(await axeViolations(element)).toEqual([]);
  });
});
