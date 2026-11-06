import { sharedAudioContext } from '../app/audio/audio-context';
import type { FakeAudioContext } from './fakes';
import { FakeWorker, flushAnimationFrames, flushMicrotasks } from './fakes';

/**
 * Drives the real click engine behind the metronome store: resets the shared fake audio clock,
 * and moves it forward with the ticker and animation frames, as the browser would.
 */
export class MetronomeDriver {
  readonly context = sharedAudioContext() as unknown as FakeAudioContext;
  private readonly workersBefore = FakeWorker.instances.length;

  constructor() {
    this.context.currentTime = 0;
    this.context.state = 'suspended';
    this.context.outputLatency = 0;
    this.context.started.length = 0;
  }

  /** The ticker worker the engine created after this driver. */
  get ticker(): FakeWorker | undefined {
    return FakeWorker.instances
      .slice(this.workersBefore)
      .find((worker) => worker.messages.includes('start'));
  }

  /** Lets `start()` finish resuming the audio context. */
  settle(): Promise<void> {
    return flushMicrotasks();
  }

  /** Moves the audio clock to `time`, schedules ahead and reports the beats that are audible by then. */
  advanceTo(time: number): void {
    this.context.currentTime = time;
    this.ticker?.reply(null);
    flushAnimationFrames();
  }

  /** Steps the clock in 25 ms ticks, like the real ticker, so every beat is reported on time. */
  playUntil(time: number): void {
    for (let t = this.context.currentTime + 0.025; t <= time + 1e-9; t += 0.025) this.advanceTo(t);
  }
}
