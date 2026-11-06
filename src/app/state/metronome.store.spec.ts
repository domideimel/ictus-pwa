import { TestBed } from '@angular/core/testing';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { BeatLevel, defaultLevels } from '../music/meter';
import type { MetronomeSetup } from './metronome.store';
import { DEFAULT_PRACTICE, MetronomeStore, parseSetup, sanitizeSetup } from './metronome.store';
import { SettingsStore } from './settings.store';

describe('MetronomeStore editing', () => {
  let store: InstanceType<typeof MetronomeStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    store = TestBed.inject(MetronomeStore);
  });

  it('starts at 120 BPM in 4/4, quarters, straight', () => {
    expect(store.bpm()).toBe(120);
    expect(store.timeSignature()).toEqual({ beats: 4, unit: 4 });
    expect(store.subdivision()).toBe(1);
    expect(store.swing()).toBe(0.5);
    expect(store.tempoMarking()).toBe('Allegro');
    expect(store.isPlaying()).toBe(false);
    expect(store.practice()).toEqual(DEFAULT_PRACTICE);
  });

  it('rounds and clamps the tempo to 20–300', () => {
    store.setBpm(99.6);
    expect(store.bpm()).toBe(100);
    store.setBpm(5);
    expect(store.bpm()).toBe(20);
    store.nudge(-5);
    expect(store.bpm()).toBe(20);
    store.setBpm(298);
    store.nudge(5);
    expect(store.bpm()).toBe(300);
  });

  it('resets grouping and accents with a new time signature', () => {
    store.cycleLevel(1);
    store.setTimeSignature({ beats: 7, unit: 8 });
    expect(store.grouping()).toEqual([2, 2, 3]);
    expect([...store.groupStarts()]).toEqual([2, 4]);
    expect(store.levels()).toEqual(defaultLevels(7));
  });

  it('ignores invalid and unchanged time signatures', () => {
    store.cycleLevel(1);
    store.setTimeSignature({ beats: 4, unit: 4 });
    expect(store.levels()[1]).toBe(BeatLevel.Mute);
    store.setTimeSignature({ beats: 17, unit: 4 });
    store.setTimeSignature({ beats: 4, unit: 5 });
    expect(store.timeSignature()).toEqual({ beats: 4, unit: 4 });
  });

  it('accepts only groupings that fill the bar', () => {
    store.setTimeSignature({ beats: 7, unit: 8 });
    store.setGrouping([3, 2, 2]);
    expect(store.grouping()).toEqual([3, 2, 2]);
    store.setGrouping([3, 3]);
    expect(store.grouping()).toEqual([3, 2, 2]);
  });

  it('cycles one beat at a time', () => {
    store.cycleLevel(2);
    expect(store.levels()).toEqual([
      BeatLevel.Accent,
      BeatLevel.Normal,
      BeatLevel.Mute,
      BeatLevel.Normal,
    ]);
    store.cycleLevel(2);
    store.cycleLevel(0);
    expect(store.levels()[2]).toBe(BeatLevel.Accent);
    expect(store.levels()[0]).toBe(BeatLevel.Normal);
  });

  it('sets subdivision and clamps swing', () => {
    store.setSubdivision(4);
    store.setSwing(0.9);
    expect(store.subdivision()).toBe(4);
    expect(store.swing()).toBe(0.75);
    store.setSwing(0.1);
    expect(store.swing()).toBe(0.5);
  });

  it('loads a piece and repairs it', () => {
    store.apply({ ...sanitizeSetup(store.setup()), bpm: 64, grouping: [9] });
    expect(store.bpm()).toBe(64);
    expect(store.grouping()).toEqual([4]);
  });

  it('averages up to the last five taps', () => {
    store.tap(0);
    expect(store.bpm()).toBe(120);
    [0, 400, 800, 1200, 1600].forEach((time) => {
      store.tap(time);
    });
    expect(store.bpm()).toBe(150);
    store.tap(2100);
    expect(store.bpm()).toBe(Math.round(60000 / ((2100 - 400) / 4)));
  });

  it('starts tap tempo over after a pause of more than two seconds', () => {
    [0, 500].forEach((time) => {
      store.tap(time);
    });
    expect(store.bpm()).toBe(120);
    [3000, 3750].forEach((time) => {
      store.tap(time);
    });
    expect(store.bpm()).toBe(80);
  });
});

describe('setup parsing', () => {
  const sevenEight: MetronomeSetup = {
    bpm: 72,
    timeSignature: { beats: 7, unit: 8 },
    grouping: [2, 2, 3],
    levels: defaultLevels(7),
    subdivision: 2,
    swing: 0.6,
  };

  it('keeps a valid setup unchanged', () => {
    expect(sanitizeSetup(sevenEight)).toEqual(sevenEight);
    expect(parseSetup(sevenEight)).toEqual(sevenEight);
  });

  it('repairs values that no longer fit', () => {
    expect(
      sanitizeSetup({
        ...sevenEight,
        timeSignature: { beats: 40, unit: 3 },
        bpm: Number.NaN,
        subdivision: 7 as never,
        swing: 0.2,
      }),
    ).toEqual({
      bpm: 120,
      timeSignature: { beats: 4, unit: 4 },
      grouping: [4],
      levels: defaultLevels(4),
      subdivision: 1,
      swing: 0.5,
    });
  });

  it('rejects levels that are not beat levels', () => {
    const levels = ['Accent', 'Normal', 'Normal', 'Normal', 1, 0, 0] as never;
    expect(sanitizeSetup({ ...sevenEight, levels }).levels).toEqual(defaultLevels(7));
    expect(
      sanitizeSetup({ ...sevenEight, levels: [...defaultLevels(7), 9] as never }).levels,
    ).toEqual(defaultLevels(7));
  });

  it('fills in missing fields of a saved setup', () => {
    expect(parseSetup({ bpm: 90 })).toEqual(expect.objectContaining({ bpm: 90, grouping: [4] }));
    expect(parseSetup({ bpm: 90, grouping: 'x', levels: { 0: 1 } })?.levels).toHaveLength(4);
    expect(parseSetup(null)).toBeNull();
    expect(parseSetup([1])).toBeNull();
  });

  it('restores the defaults from a damaged save', () => {
    localStorage.setItem('ictus.metronome', JSON.stringify({ setup: 'x', practice: 3 }));
    TestBed.resetTestingModule();
    const store = TestBed.inject(MetronomeStore);
    expect(store.bpm()).toBe(120);
    expect(store.practice()).toEqual(DEFAULT_PRACTICE);
    localStorage.setItem('ictus.metronome', JSON.stringify(null));
    TestBed.resetTestingModule();
    expect(TestBed.inject(MetronomeStore).bpm()).toBe(120);
  });
});

describe('MetronomeStore playback', () => {
  let store: InstanceType<typeof MetronomeStore>;
  let driver: MetronomeDriver;
  let vibrations: (number | number[])[];

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    vibrations = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => vibrations.push(pattern),
    });
    driver = new MetronomeDriver();
    store = TestBed.inject(MetronomeStore);
  });

  afterEach(() => {
    store.stop();
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  const startPlaying = async (): Promise<void> => {
    store.toggle();
    await driver.settle();
  };

  it('plays, lights the beats as they sound, and stops', async () => {
    await startPlaying();
    expect(store.isPlaying()).toBe(true);
    driver.playUntil(0.1);
    expect(store.currentBeat()).toBe(0);
    driver.playUntil(0.6);
    expect(store.currentBeat()).toBe(1);
    driver.playUntil(2.1);
    expect(store.currentBeat()).toBe(0);
    expect(store.currentBar()).toBe(1);

    store.toggle();
    expect(store.isPlaying()).toBe(false);
    expect(store.currentBeat()).toBeNull();
    expect(driver.ticker?.messages.at(-1)).toBe('stop');
  });

  it('vibrates hardest on the downbeat, then group starts, then beats', async () => {
    store.setTimeSignature({ beats: 5, unit: 4 });
    await startPlaying();
    driver.playUntil(2.4);
    expect(vibrations).toEqual([35, 12, 12, 20, 12]);
  });

  it('does not vibrate muted beats or when vibration is off', async () => {
    store.cycleLevel(1);
    await startPlaying();
    driver.playUntil(1.1);
    // Beat 2 is muted: downbeat and beat 3 only.
    expect(vibrations).toEqual([35, 12]);
    TestBed.inject(SettingsStore).update({ vibration: false });
    driver.playUntil(2.1);
    expect(vibrations).toEqual([35, 12]);
  });

  it('reports the speed-trainer tempo while playing', async () => {
    store.setBpm(100);
    store.editablePractice.update((practice) => ({
      ...practice,
      speedTrainer: { enabled: true, step: 10, everyBars: 1, target: 115 },
    }));
    TestBed.tick();
    expect(store.currentTempo()).toBe(100);
    await startPlaying();
    driver.playUntil(2.45);
    expect(store.currentTempo()).toBe(100);
    // Bar 2 starts at 2.46 s and plays at 110 BPM.
    driver.playUntil(4.5);
    expect(store.currentBar()).toBe(1);
    expect(store.currentTempo()).toBe(110);
    store.stop();
    expect(store.currentTempo()).toBe(100);
  });

  it('knows when a gap-click bar is silent', async () => {
    store.editablePractice.update((practice) => ({
      ...practice,
      gapClick: { enabled: true, play: 1, mute: 1 },
    }));
    TestBed.tick();
    await startPlaying();
    driver.playUntil(1.9);
    expect(store.isInGap()).toBe(false);
    driver.playUntil(2.2);
    expect(store.isInGap()).toBe(true);
    expect(vibrations).toEqual([35, 12, 12, 12]);
  });

  it('plays the polyrhythm voice and passes the settings volumes to the engine', async () => {
    TestBed.inject(SettingsStore).update({ polyVolume: 0.4, beatVolume: 0.7 });
    store.editablePractice.update((practice) => ({ ...practice, polyrhythm: '3:2' }));
    TestBed.tick();
    await startPlaying();
    driver.playUntil(1.06);
    const gains = driver.context.started.map((source) => source.gain);
    // Beats at 0.06, 0.56 and 1.06 s; the third beat schedules the clicks of its own span too.
    expect(gains.filter((gain) => gain === 0.4)).toHaveLength(5);
    expect(gains.filter((gain) => gain === 0.7)).toHaveLength(2);
  });

  it('stays stopped when stopped again while the audio starts', async () => {
    store.toggle();
    store.toggle();
    await driver.settle();
    expect(store.isPlaying()).toBe(false);
    expect(driver.ticker?.messages.at(-1)).toBe('stop');
  });

  it('recovers when the audio cannot start', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(driver.context, 'resume').mockRejectedValueOnce(new Error('blocked'));
    await startPlaying();
    expect(store.isPlaying()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('restarts the bar count on every start', async () => {
    await startPlaying();
    driver.playUntil(2.2);
    expect(store.currentBar()).toBe(1);
    store.stop();
    await startPlaying();
    expect(store.currentBar()).toBe(0);
  });

  it('counts a rest silently and signals the entrance', async () => {
    store.editablePractice.update((practice) => ({
      ...practice,
      gapClick: { enabled: true, play: 1, mute: 1 },
      polyrhythm: '3:2',
    }));
    TestBed.tick();
    store.startRest(2, false);
    await driver.settle();
    expect(store.rest()).toEqual({ bars: 2, audible: false, finished: false });
    expect(store.isInGap()).toBe(false);
    driver.playUntil(3.9);
    expect(store.currentBar()).toBe(1);
    expect(driver.context.started).toEqual([]);

    driver.playUntil(4.1);
    expect(store.isPlaying()).toBe(false);
    expect(store.rest()?.finished).toBe(true);
    expect(vibrations.at(-1)).toEqual([60, 40, 60]);

    store.endRest();
    expect(store.rest()).toBeNull();
  });

  it('counts audibly when asked and never for less than one bar', async () => {
    store.startRest(0, true);
    await driver.settle();
    expect(store.rest()?.bars).toBe(1);
    driver.playUntil(0.1);
    expect(driver.context.started.length).toBeGreaterThan(0);
  });
});
