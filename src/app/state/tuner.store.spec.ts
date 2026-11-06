import { TestBed } from '@angular/core/testing';
import { FakeWorker, fakeStream, flushMicrotasks, stubGetUserMedia } from '../../testing/fakes';
import { MetronomeDriver } from '../../testing/metronome-driver';
import { setPageVisible } from '../../testing/visibility';
import { MetronomeStore } from './metronome.store';
import { SettingsStore } from './settings.store';
import { PitchSmoother, TunerStore } from './tuner.store';

describe('TunerStore', () => {
  let tuner: InstanceType<typeof TunerStore>;
  let stream: ReturnType<typeof fakeStream>;
  let requests: number;
  let workersBefore: number;

  /** The pitch worker the microphone created. */
  const pitchWorker = (): FakeWorker =>
    FakeWorker.instances.slice(workersBefore).find((worker) => !worker.messages.includes('start'))!;
  const settle = async (): Promise<void> => {
    TestBed.tick();
    await flushMicrotasks();
    TestBed.tick();
  };
  const hear = (...frequencies: (number | null)[]): void => {
    for (const frequency of frequencies) pitchWorker().reply(frequency);
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    setPageVisible(true);
    new MetronomeDriver();
    workersBefore = FakeWorker.instances.length;
    stream = fakeStream();
    requests = 0;
    stubGetUserMedia(() => {
      requests += 1;
      return Promise.resolve(stream);
    });
    tuner = TestBed.inject(TunerStore);
  });

  afterEach(() => {
    TestBed.inject(MetronomeStore).stop();
  });

  it('does not touch the microphone until Start is pressed on screen', async () => {
    tuner.setOnScreen(true);
    await settle();
    expect(requests).toBe(0);
    expect(tuner.isListening()).toBe(false);

    tuner.toggle();
    await settle();
    expect(tuner.switchedOn()).toBe(true);
    expect(tuner.isListening()).toBe(true);
    expect(requests).toBe(1);
  });

  it('waits until the tuner is on screen', async () => {
    tuner.toggle();
    await settle();
    expect(tuner.isListening()).toBe(false);
    tuner.setOnScreen(true);
    await settle();
    expect(tuner.isListening()).toBe(true);
  });

  it('shows a steady reading of what it hears', async () => {
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    hear(442);
    expect(tuner.reading()).toBeNull();
    hear(442.5);
    expect(tuner.reading()).toEqual(expect.objectContaining({ midi: 69 }));
    expect(tuner.isInTune()).toBe(true);

    hear(452, 452, 452);
    expect(tuner.reading()?.cents).toBeGreaterThan(5);
    expect(tuner.isInTune()).toBe(false);
  });

  it('measures against the reference pitch and tolerance from settings', async () => {
    const settings = TestBed.inject(SettingsStore);
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    hear(440, 440);
    expect(tuner.reading()?.cents).toBeCloseTo(-7.85, 1);
    expect(tuner.isInTune()).toBe(false);
    settings.update({ tolerance: 10 });
    expect(tuner.isInTune()).toBe(true);
    settings.update({ referencePitch: 440 });
    expect(tuner.reading()?.cents).toBeCloseTo(0, 6);
  });

  it('counts one strike per new note', async () => {
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    hear(200, 200, 200, 200);
    expect(tuner.strikeCount()).toBe(1);
    expect(tuner.strikeFrequency()).toBe(200);
    hear(null, null, 210, 210, 210);
    expect(tuner.strikeCount()).toBe(2);
    expect(tuner.strikeFrequency()).toBe(210);
  });

  it('stops listening and forgets the note when switched off', async () => {
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    hear(220, 220);
    tuner.toggle();
    await settle();
    expect(tuner.isListening()).toBe(false);
    expect(tuner.frequency()).toBeNull();
    expect(stream.stoppedTracks).toBe(1);
  });

  it('switches off when leaving the tuner screen', async () => {
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    tuner.setOnScreen(false);
    await settle();
    expect(tuner.switchedOn()).toBe(false);
    expect(tuner.isListening()).toBe(false);
  });

  it('pauses in the background and resumes on return', async () => {
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    setPageVisible(false);
    await settle();
    expect(tuner.isListening()).toBe(false);
    expect(tuner.switchedOn()).toBe(true);
    setPageVisible(true);
    await settle();
    expect(tuner.isListening()).toBe(true);
  });

  it('pauses while the click plays and stops the click when started', async () => {
    const metronome = TestBed.inject(MetronomeStore);
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    metronome.toggle();
    await settle();
    expect(tuner.isListening()).toBe(false);
    expect(tuner.isPausedForClick()).toBe(true);

    tuner.toggle();
    tuner.toggle();
    await settle();
    expect(metronome.isPlaying()).toBe(false);
    expect(tuner.isListening()).toBe(true);
  });

  it('reports a denied microphone and switches off', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubGetUserMedia(() => Promise.reject(new DOMException('no', 'NotAllowedError')));
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    expect(tuner.microphoneDenied()).toBe(true);
    expect(tuner.switchedOn()).toBe(false);

    stubGetUserMedia(() => Promise.resolve(stream));
    tuner.toggle();
    await settle();
    expect(tuner.microphoneDenied()).toBe(false);
    warn.mockRestore();
  });

  it('treats other microphone errors as not denied', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stubGetUserMedia(() => Promise.reject(new DOMException('busy', 'NotReadableError')));
    tuner.setOnScreen(true);
    tuner.toggle();
    await settle();
    expect(tuner.microphoneDenied()).toBe(false);
    expect(tuner.switchedOn()).toBe(false);
    warn.mockRestore();
  });

  it('lets go of the microphone when switched off while it was starting', async () => {
    let grant: (stream: MediaStream) => void = () => undefined;
    stubGetUserMedia(() => new Promise((resolve) => (grant = resolve)));
    tuner.setOnScreen(true);
    tuner.toggle();
    TestBed.tick();
    tuner.toggle();
    TestBed.tick();
    grant(stream);
    await settle();
    expect(tuner.isListening()).toBe(false);
    expect(stream.stoppedTracks).toBe(1);
  });
});

describe('PitchSmoother', () => {
  it('needs two readings before it shows a note', () => {
    const smoother = new PitchSmoother();
    smoother.ingest(220, 0);
    expect(smoother.frequency).toBeNull();
    smoother.ingest(221, 40);
    expect(smoother.frequency).toBe(221);
  });

  it('shows the median of the last five readings', () => {
    const smoother = new PitchSmoother();
    [220, 230, 221, 222, 219].forEach((value, i) => {
      smoother.ingest(value, i * 40);
    });
    expect(smoother.frequency).toBe(221);
  });

  it('starts a new note on a jump of more than 60 cents', () => {
    const smoother = new PitchSmoother();
    [220, 220, 220].forEach((value, i) => {
      smoother.ingest(value, i * 40);
    });
    expect(smoother.strikeCount).toBe(1);
    [330, 330, 330].forEach((value, i) => {
      smoother.ingest(value, 200 + i * 40);
    });
    expect(smoother.strikeCount).toBe(2);
    expect(smoother.strikeFrequency).toBe(330);
  });

  it('holds the last note for 1.5 s of silence', () => {
    const smoother = new PitchSmoother();
    [220, 220].forEach((value, i) => {
      smoother.ingest(value, i * 40);
    });
    smoother.ingest(null, 1500);
    expect(smoother.frequency).toBe(220);
    smoother.ingest(null, 1600);
    expect(smoother.frequency).toBeNull();
  });

  it('forgets everything on reset', () => {
    const smoother = new PitchSmoother();
    [220, 220].forEach((value, i) => {
      smoother.ingest(value, i * 40);
    });
    smoother.reset();
    expect(smoother.frequency).toBeNull();
    smoother.ingest(220, 100);
    expect(smoother.frequency).toBeNull();
  });
});
