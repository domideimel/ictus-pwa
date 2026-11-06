import { TestBed } from '@angular/core/testing';
import { TunerStore } from '../app/state/tuner.store';
import { FakeWorker, fakeStream, flushMicrotasks, stubGetUserMedia } from './fakes';
import { MetronomeDriver } from './metronome-driver';
import { setPageVisible } from './visibility';

/** Switches the real tuner on with a fake microphone and feeds it pitches as the pitch worker would. */
export class TunerDriver {
  private readonly workersBefore: number;
  readonly stream = fakeStream();

  constructor() {
    setPageVisible(true);
    new MetronomeDriver();
    this.workersBefore = FakeWorker.instances.length;
    stubGetUserMedia(() => Promise.resolve(this.stream));
  }

  async switchOn(): Promise<void> {
    const tuner = TestBed.inject(TunerStore);
    tuner.setOnScreen(true);
    if (!tuner.switchedOn()) tuner.toggle();
    await this.settle();
  }

  async settle(): Promise<void> {
    TestBed.tick();
    await flushMicrotasks();
    TestBed.tick();
  }

  /** Each frequency is one detection result; null is silence. */
  hear(...frequencies: (number | null)[]): void {
    const worker = FakeWorker.instances
      .slice(this.workersBefore)
      .find((candidate) => !candidate.messages.includes('start'));
    if (!worker) throw new Error('The tuner is not listening');
    for (const frequency of frequencies) worker.reply(frequency);
  }

  /** A steady note long enough to count as a strike. */
  strike(frequency: number): void {
    this.hear(null, null, frequency, frequency, frequency);
  }
}
