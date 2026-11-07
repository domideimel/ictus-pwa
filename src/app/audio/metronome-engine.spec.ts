import type { FakeAudioContext, StartedSource } from '../../testing/fakes';
import { FakeWorker, flushAnimationFrames, pendingAnimationFrames } from '../../testing/fakes';
import { DEFAULT_GAP_CLICK, DEFAULT_SPEED_TRAINER } from '../music/practice';
import { defaultLevels, groupStarts } from '../music/meter';
import { sharedAudioContext } from './audio-context';
import type { ClickParams, ScheduledBeat } from './click-scheduler';
import type { ClickSound } from './click-synth';
import { MetronomeEngine } from './metronome-engine';

const base: ClickParams = {
  bpm: 120,
  levels: defaultLevels(4),
  beatLengths: [1, 1, 1, 1],
  tempoUnits: 1,
  groupStarts: groupStarts([4]),
  subdivision: 1,
  swing: 0.5,
  gap: DEFAULT_GAP_CLICK,
  trainer: DEFAULT_SPEED_TRAINER,
  polyrhythm: 'off',
  silent: false,
  accentVolume: 1,
  beatVolume: 0.8,
  subdivisionVolume: 0.5,
  polyVolume: 0.9,
};

describe('MetronomeEngine', () => {
  let context: FakeAudioContext;
  let params: ClickParams;
  let sound: ClickSound;
  let beats: ScheduledBeat[];
  let engine: MetronomeEngine;

  const ticker = (): FakeWorker => FakeWorker.instances.at(-1)!;
  /** Moves the audio clock and lets the ticker wake the scheduler. */
  const advance = (time: number): void => {
    context.currentTime = time;
    ticker().reply(null);
    flushAnimationFrames();
  };

  beforeEach(() => {
    context = sharedAudioContext() as unknown as FakeAudioContext;
    context.currentTime = 0;
    context.state = 'suspended';
    context.started.length = 0;
    params = base;
    sound = 'click';
    beats = [];
    engine = new MetronomeEngine(
      () => params,
      () => sound,
      (beat) => beats.push(beat),
    );
  });

  afterEach(() => {
    engine.dispose();
  });

  it('resumes the audio context and plays the first beat a moment after start', async () => {
    await engine.start();
    expect(context.state).toBe('running');
    expect(engine.isRunning).toBe(true);
    expect(ticker().messages).toEqual(['start']);
    expect(context.started).toEqual([expect.objectContaining({ when: 0.06, gain: 1 })]);
  });

  it('keeps scheduling a little ahead each time the ticker wakes it', async () => {
    await engine.start();
    advance(0.5);
    advance(1);
    expect(context.started.map((source) => source.when)).toEqual([0.06, 0.56, 1.06]);
    expect(context.started.map((source) => source.gain)).toEqual([1, 0.8, 0.8]);
  });

  it('reports each beat once it is audible', async () => {
    await engine.start();
    flushAnimationFrames();
    expect(beats).toEqual([]);
    advance(0.07);
    expect(beats).toEqual([{ time: 0.06, index: 0, bar: 0 }]);
    advance(0.6);
    expect(beats.map((beat) => beat.index)).toEqual([0, 1]);
  });

  it('keeps reporting beats from the ticker when no animation frames run (background tab)', async () => {
    await engine.start();
    context.currentTime = 0.07;
    ticker().reply(null);
    expect(beats).toEqual([{ time: 0.06, index: 0, bar: 0 }]);
    context.currentTime = 0.6;
    ticker().reply(null);
    expect(beats.map((beat) => beat.index)).toEqual([0, 1]);
  });

  it('reports only the latest of the beats that went by unseen', async () => {
    // Fast enough that the lookahead holds two beats (0.06 and 0.10 s), then a frame comes late.
    params = { ...base, bpm: 1500 };
    await engine.start();
    context.currentTime = 0.11;
    flushAnimationFrames();
    expect(beats).toEqual([{ time: 0.1, index: 1, bar: 0 }]);
  });

  it('stops asking for animation frames once a reported beat stops the click', async () => {
    engine = new MetronomeEngine(
      () => params,
      () => sound,
      () => {
        engine.stop();
      },
    );
    await engine.start();
    context.currentTime = 0.07;
    flushAnimationFrames();
    expect(engine.isRunning).toBe(false);
    expect(pendingAnimationFrames()).toBe(0);
  });

  it('plays the click sound when the saved sound is unknown', async () => {
    sound = 'bell' as ClickSound;
    await engine.start();
    expect(context.started[0]?.buffer?.length).toBe(Math.floor(0.04 * 48_000));
  });

  it('allows for output latency when reporting beats', async () => {
    context.outputLatency = 0.05;
    await engine.start();
    advance(0.1);
    expect(beats).toEqual([]);
    advance(0.11);
    expect(beats).toHaveLength(1);
    context.outputLatency = 0;
  });

  it('uses the selected click sound and reads settings on every tick', async () => {
    sound = 'woodblock';
    await engine.start();
    sound = 'cowbell';
    params = { ...base, beatVolume: 0.3 };
    advance(0.5);
    const [first, second] = context.started as [StartedSource, StartedSource];
    expect(first.buffer?.length).toBe(Math.floor(0.09 * 48_000));
    expect(second.buffer?.length).toBe(Math.floor(0.3 * 48_000));
    expect(second.gain).toBe(0.3);
  });

  it('skips clicks whose volume is zero', async () => {
    params = { ...base, accentVolume: 0 };
    await engine.start();
    expect(context.started).toEqual([]);
    advance(0.5);
    expect(context.started).toHaveLength(1);
  });

  it('stops the ticker, the animation frame and every scheduled sound', async () => {
    await engine.start();
    engine.stop();
    expect(engine.isRunning).toBe(false);
    expect(ticker().messages).toEqual(['start', 'stop']);
    expect(pendingAnimationFrames()).toBe(0);
    advance(0.5);
    expect(context.started).toHaveLength(1);
    expect(beats).toEqual([]);
  });

  it('starts only once when started twice while the context resumes', async () => {
    const workersBefore = FakeWorker.instances.length;
    await Promise.all([engine.start(), engine.start()]);
    expect(context.started).toHaveLength(1);
    expect(FakeWorker.instances.length - workersBefore).toBe(1);
    expect(ticker().messages).toEqual(['start']);
  });

  it('can restart after stopping and reuses its ticker', async () => {
    await engine.start();
    engine.stop();
    context.currentTime = 5;
    await engine.start();
    expect(ticker().messages).toEqual(['start', 'stop', 'start']);
    expect(context.started.at(-1)?.when).toBeCloseTo(5.06, 9);
  });

  it('ignores stop before start and terminates the ticker on dispose', async () => {
    engine.stop();
    await engine.start();
    const worker = ticker();
    engine.dispose();
    expect(worker.terminated).toBe(true);
  });
});
