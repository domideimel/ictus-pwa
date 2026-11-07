import { sharedAudioContext } from './audio-context';
import type { PitchRequest } from './pitch-detector';

const WINDOW_SIZE = 4096;
const HOP_SIZE = 2048;

/**
 * Captures the microphone and reports one pitch (or null for silence) per hop of 2048 samples.
 * Detection runs in a web worker so the UI never stutters.
 */
export class Microphone {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private worker: Worker | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;
  /** The start in progress; a second start while the permission prompt is open waits for it. */
  private starting: Promise<void> | null = null;
  /** Bumped by `stop()`, so a start that was still waiting for the stream gives it back. */
  private session = 0;

  constructor(private readonly onPitch: (frequency: number | null) => void) {}

  /** Throws a DOMException named NotAllowedError when the user denies access. */
  start(): Promise<void> {
    if (this.stream) return Promise.resolve();
    this.starting ??= this.open().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  private async open(): Promise<void> {
    const session = this.session;
    const context = sharedAudioContext();
    // Raw input: echo cancellation and noise suppression bend the pitch of sustained notes.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    if (context.state !== 'running') await context.resume();
    if (session !== this.session) {
      stopTracks(stream);
      return;
    }
    this.stream = stream;
    this.source = context.createMediaStreamSource(stream);
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = WINDOW_SIZE;
    this.source.connect(this.analyser);

    this.worker ??= this.createWorker();
    this.timer = setInterval(
      () => {
        this.analyse(context.sampleRate);
      },
      (HOP_SIZE / context.sampleRate) * 1000,
    );
  }

  stop(): void {
    this.session += 1;
    clearInterval(this.timer);
    this.timer = undefined;
    this.source?.disconnect();
    if (this.stream) stopTracks(this.stream);
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.busy = false;
  }

  dispose(): void {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./pitch.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<number | null>) => {
      this.busy = false;
      if (this.stream) this.onPitch(data);
    };
    // A failed detection must not leave the worker marked busy, or the tuner would stop updating.
    worker.onerror = (event) => {
      event.preventDefault();
      console.error('Pitch detection failed', event.message);
      this.busy = false;
    };
    worker.onmessageerror = () => {
      this.busy = false;
    };
    return worker;
  }

  /** Skips a hop while the worker is still busy rather than queueing work behind it. */
  private analyse(sampleRate: number): void {
    if (!this.analyser || !this.worker || this.busy) return;
    const samples = new Float32Array(WINDOW_SIZE);
    this.analyser.getFloatTimeDomainData(samples);
    this.busy = true;
    const request: PitchRequest = { sampleRate, samples };
    this.worker.postMessage(request, [samples.buffer]);
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
