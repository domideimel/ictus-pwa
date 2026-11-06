import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { byLabel, click } from '../../testing/dom';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { setPageVisible } from '../../testing/visibility';
import { MetronomeStore } from '../state/metronome.store';
import { UpdatePrompt } from './update-prompt';

const ready: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'a' },
  latestVersion: { hash: 'b' },
};

describe('UpdatePrompt', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let checkForUpdate: ReturnType<typeof vi.fn>;

  const create = async (isEnabled = true) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SwUpdate,
          useValue: { isEnabled, versionUpdates, unrecoverable, checkForUpdate },
        },
      ],
    });
    const fixture = TestBed.createComponent(UpdatePrompt);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    return { fixture, dialog };
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    setPageVisible(true);
    new MetronomeDriver();
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    checkForUpdate = vi.fn(() => Promise.resolve(false));
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(MetronomeStore).stop();
  });

  it('stays hidden until a new version is ready', async () => {
    const { fixture, dialog } = await create();
    expect(dialog.open).toBe(false);
    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    await fixture.whenStable();
    expect(dialog.open).toBe(false);

    versionUpdates.next(ready);
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('update-title');
    expect(dialog.textContent).toContain('A new version of Ictus is ready.');
    expect(byLabel(dialog, 'Reload')).toBeTruthy();
  });

  it('closes on Later and comes back for the next version', async () => {
    const { fixture, dialog } = await create();
    versionUpdates.next(ready);
    await fixture.whenStable();
    await click(fixture, byLabel(dialog, 'Later'));
    expect(dialog.open).toBe(false);
    await fixture.whenStable();
    expect(dialog.open).toBe(false);

    versionUpdates.next(ready);
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
  });

  it('waits while the click plays', async () => {
    const { fixture, dialog } = await create();
    const metronome = TestBed.inject(MetronomeStore);
    metronome.toggle();
    versionUpdates.next(ready);
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    metronome.stop();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
  });

  it('waits while the rest counter runs', async () => {
    const { fixture, dialog } = await create();
    const metronome = TestBed.inject(MetronomeStore);
    metronome.startRest(4, false);
    metronome.stop();
    versionUpdates.next(ready);
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    metronome.endRest();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
  });

  it('asks for a reload when the cached version is broken', async () => {
    const { fixture, dialog } = await create();
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'missing file' });
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('can no longer load all of its files');
  });

  it('checks on start, every half hour and on returning to the app', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const { fixture } = await create();
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);

    setPageVisible(false);
    await fixture.whenStable();
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
    setPageVisible(true);
    await fixture.whenStable();
    expect(checkForUpdate).toHaveBeenCalledTimes(3);

    fixture.destroy();
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(checkForUpdate).toHaveBeenCalledTimes(3);
  });

  it('shrugs off a failed check, e.g. offline', async () => {
    checkForUpdate.mockImplementation(() => Promise.reject(new Error('offline')));
    const { fixture, dialog } = await create();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
  });

  it('does nothing without a service worker', async () => {
    const { fixture, dialog } = await create(false);
    versionUpdates.next(ready);
    await fixture.whenStable();
    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });
});
