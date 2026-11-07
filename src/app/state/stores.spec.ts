import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { BeatLevel } from '../music/meter';
import { LibraryStore } from './library.store';
import type { MetronomeSetup } from './metronome.store';
import { MetronomeStore, parseSetup, sanitizeSetup } from './metronome.store';
import { PitchSmoother } from './tuner.store';
import { SettingsStore } from './settings.store';
import { withDefaults } from './storage';

const sevenEight: MetronomeSetup = {
  bpm: 72,
  timeSignature: { beats: 7, unit: 8 },
  grouping: [2, 2, 3],
  pulse: 'unit',
  levels: [
    BeatLevel.Accent,
    BeatLevel.Normal,
    BeatLevel.Accent,
    BeatLevel.Normal,
    BeatLevel.Accent,
    BeatLevel.Normal,
    BeatLevel.Mute,
  ],
  subdivision: 2,
  swing: 0.5,
};

describe('stores', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('persists setlists across launches', () => {
    const store = TestBed.inject(LibraryStore);
    const setlist = store.addSetlist('Concert');
    store.addPiece(setlist.id, 'Bolero', sevenEight);
    TestBed.tick();

    TestBed.resetTestingModule();
    const saved = TestBed.inject(LibraryStore).setlists()[0]!.pieces[0]!;
    expect(saved.name).toBe('Bolero');
    expect(saved.grouping).toEqual([2, 2, 3]);
    expect(saved.levels.at(-1)).toBe(BeatLevel.Mute);
  });

  it('steps through a setlist', () => {
    const store = TestBed.inject(LibraryStore);
    const setlist = store.addSetlist('Concert');
    const one = store.addPiece(setlist.id, 'One', { ...sevenEight, bpm: 60 });
    store.addPiece(setlist.id, 'Two', { ...sevenEight, bpm: 90 });
    store.setActivePiece({ setlistId: setlist.id, pieceId: one.id });
    expect(store.step(1)?.name).toBe('Two');
    expect(store.step(1)).toBeNull();
    expect(store.activePosition()?.index).toBe(1);
    expect(store.step(-1)?.name).toBe('One');
  });

  it('resets grouping and accents with the time signature', () => {
    const store = TestBed.inject(MetronomeStore);
    store.setTimeSignature({ beats: 7, unit: 8 });
    expect(store.grouping()).toEqual([2, 2, 3]);
    expect(store.levels()).toHaveLength(7);
    store.cycleLevel(0);
    expect(store.levels()[0]).toBe(BeatLevel.Normal);
  });

  it('averages tap tempo and starts over after a pause', () => {
    const store = TestBed.inject(MetronomeStore);
    [0, 500, 1000, 1500].forEach((time) => {
      store.tap(time);
    });
    expect(store.bpm()).toBe(120);
    [5000, 5600].forEach((time) => {
      store.tap(time);
    });
    expect(store.bpm()).toBe(100);
  });

  it('repairs setups that no longer fit together', () => {
    const repaired = sanitizeSetup({
      ...sevenEight,
      grouping: [3, 3],
      pulse: 'unit',
      levels: [],
      bpm: 999,
      swing: 2,
    });
    expect(repaired.grouping).toEqual([2, 2, 3]);
    expect(repaired.levels).toHaveLength(7);
    expect(repaired.bpm).toBe(300);
    expect(repaired.swing).toBe(0.75);
  });

  it('fills in keys added by later versions', () => {
    expect(withDefaults({ a: 1, b: 2, c: true })({ a: 5, b: 'wrong type', d: 1 })).toEqual({
      a: 5,
      b: 2,
      c: true,
    });
  });

  it('stores setlists in the same format as before', () => {
    TestBed.inject(LibraryStore).addSetlist('Concert');
    const stored = JSON.parse(localStorage.getItem('ictus.setlists') ?? 'null');
    expect(stored).toEqual([expect.objectContaining({ name: 'Concert', pieces: [] })]);
  });

  it('keeps defaults when stored settings are corrupt', () => {
    localStorage.setItem('ictus.settings', '{not json');
    expect(TestBed.inject(SettingsStore).referencePitch()).toBe(442);
  });

  it('repairs stored settings that are out of range or name unknown options', () => {
    localStorage.setItem(
      'ictus.settings',
      JSON.stringify({
        referencePitch: 999,
        tolerance: 7,
        clef: 'alto',
        accidentals: 'both',
        clickSound: 'bell',
        accentVolume: 3,
        beatVolume: -1,
        pedalMode: 'scroll',
        tunerMode: 'strobe',
        drumLugs: 40,
      }),
    );
    const settings = TestBed.inject(SettingsStore);
    expect(settings.referencePitch()).toBe(450);
    expect(settings.tolerance()).toBe(5);
    expect(settings.clef()).toBe('bass');
    expect(settings.accidentals()).toBe('flats');
    expect(settings.clickSound()).toBe('click');
    expect(settings.accentVolume()).toBe(1);
    expect(settings.beatVolume()).toBe(0);
    expect(settings.pedalMode()).toBe('tapAndStartStop');
    expect(settings.tunerMode()).toBe('chromatic');
    expect(settings.drumLugs()).toBe(16);
  });

  it('repairs nested practice tools, so a trainer saved without a target still clicks', () => {
    localStorage.setItem(
      'ictus.metronome',
      JSON.stringify({
        practice: {
          gapClick: { enabled: true, play: 0 },
          speedTrainer: { enabled: true, step: 4, everyBars: 4 },
          polyrhythm: '7:6',
          restBars: 5000,
        },
      }),
    );
    const practice = TestBed.inject(MetronomeStore).practice();
    expect(practice.gapClick).toEqual({ enabled: true, play: 1, mute: 2 });
    expect(practice.speedTrainer).toEqual({ enabled: true, step: 4, everyBars: 4, target: 160 });
    expect(practice.polyrhythm).toBe('off');
    expect(practice.restBars).toBe(999);
  });

  it('drops a stored grouping with sizes that are not whole beats', () => {
    expect(
      parseSetup({ timeSignature: { beats: 4, unit: 8 }, grouping: [5, -1], pulse: 'group' })
        ?.grouping,
    ).toEqual([4]);
  });

  it('saves settings edited through the form model', () => {
    const store = TestBed.inject(SettingsStore);
    store.editable.update((settings) => ({ ...settings, referencePitch: 440 }));
    TestBed.tick();
    expect(store.referencePitch()).toBe(440);

    TestBed.resetTestingModule();
    expect(TestBed.inject(SettingsStore).referencePitch()).toBe(440);
  });

  it('lets a signal form edit nested practice settings', () => {
    const store = TestBed.inject(MetronomeStore);
    const practice = TestBed.runInInjectionContext(() => form(store.editablePractice));
    practice.gapClick.enabled().value.set(true);
    TestBed.tick();
    expect(store.practice().gapClick.enabled).toBe(true);
  });

  it('saves the metronome setup and practice tools', () => {
    const store = TestBed.inject(MetronomeStore);
    store.setBpm(96);
    store.editablePractice.update((practice) => ({ ...practice, restBars: 12 }));
    TestBed.tick();

    TestBed.resetTestingModule();
    const restored = TestBed.inject(MetronomeStore);
    expect(restored.bpm()).toBe(96);
    expect(restored.practice().restBars).toBe(12);
  });
});

describe('PitchSmoother', () => {
  it('counts one strike per new note and holds the last note briefly', () => {
    const smoother = new PitchSmoother();
    [220, 221, 220, 220].forEach((frequency, i) => {
      smoother.ingest(frequency, i * 40);
    });
    expect(smoother.strikeCount).toBe(1);
    expect(smoother.frequency).toBe(220);

    smoother.ingest(null, 200);
    smoother.ingest(null, 240);
    expect(smoother.frequency).toBe(220);
    smoother.ingest(null, 2000);
    expect(smoother.frequency).toBeNull();

    [330, 331, 330].forEach((frequency, i) => {
      smoother.ingest(frequency, 2100 + i * 40);
    });
    expect(smoother.strikeCount).toBe(2);
  });
});
