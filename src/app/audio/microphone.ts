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

  constructor(private readonly onPitch: (frequency: number | null) => void) {}

  /** Throws a DOMException named NotAllowedError when the user denies access. */
  async start(): Promise<void> {
    if (this.stream) return;
    const context = sharedAudioContext();
    // Raw input: echo cancellation and noise suppression bend the pitch of sustained notes.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    if (context.state !== 'running') await context.resume();
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
    clearInterval(this.timer);
    this.timer = undefined;
    this.source?.disconnect();
    for (const track of this.stream?.getTracks() ?? []) track.stop();
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
