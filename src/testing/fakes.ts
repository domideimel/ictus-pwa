/**
 * Test doubles for Web Audio, workers and animation frames. Time only moves when a spec moves it,
 * so the click engine and the microphone can be tested beat by beat.
 */

export interface StartedSource {
  readonly when: number;
  readonly buffer: FakeAudioBuffer | null;
  readonly gain: number;
}

export class FakeAudioBuffer {
  readonly data: Float32Array;

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.data = new Float32Array(length);
  }

  copyToChannel(source: Float32Array): void {
    this.data.set(source);
  }
}

class FakeNode {
  readonly connections: FakeNode[] = [];

  connect<T extends FakeNode>(node: T): T {
    this.connections.push(node);
    return node;
  }

  disconnect(): void {
    this.connections.length = 0;
  }
}

class FakeGainNode extends FakeNode {
  readonly gain = { value: 1 };
}

class FakeBufferSource extends FakeNode {
  buffer: FakeAudioBuffer | null = null;
  onended: (() => void) | null = null;
  stopped = false;

  constructor(private readonly context: FakeAudioContext) {
    super();
  }

  start(when = 0): void {
    const gain = this.connections[0] instanceof FakeGainNode ? this.connections[0].gain.value : 1;
    this.context.started.push({ when, buffer: this.buffer, gain });
  }

  stop(): void {
    this.stopped = true;
    this.onended?.();
  }
}

class FakeAnalyser extends FakeNode {
  fftSize = 2048;

  constructor(private readonly context: FakeAudioContext) {
    super();
  }

  getFloatTimeDomainData(target: Float32Array): void {
    target.set(this.context.microphoneInput.subarray(0, target.length));
  }
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  currentTime = 0;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  readonly sampleRate: number;
  readonly destination = new FakeNode();
  outputLatency = 0;
  baseLatency = 0;
  /** Every buffer source started, in order. */
  readonly started: StartedSource[] = [];
  /** What the microphone analyser returns. */
  microphoneInput = new Float32Array(8192);
  resumeCount = 0;

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 48_000;
    FakeAudioContext.instances.push(this);
  }

  static get latest(): FakeAudioContext {
    const context = FakeAudioContext.instances.at(-1);
    if (!context) throw new Error('No AudioContext was created');
    return context;
  }

  async resume(): Promise<void> {
    this.resumeCount += 1;
    this.state = 'running';
  }

  createBuffer(channels: number, length: number, sampleRate: number): FakeAudioBuffer {
    return new FakeAudioBuffer(channels, length, sampleRate);
  }

  createBufferSource(): FakeBufferSource {
    return new FakeBufferSource(this);
  }

  createGain(): FakeGainNode {
    return new FakeGainNode();
  }

  createMediaStreamSource(): FakeNode {
    return new FakeNode();
  }

  createAnalyser(): FakeAnalyser {
    return new FakeAnalyser(this);
  }
}

export class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly messages: unknown[] = [];
  terminated = false;

  constructor(readonly url: string | URL) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  /** Sends a message from the worker to the page. */
  reply(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  terminate(): void {
    this.terminated = true;
  }
}

let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;

/** Replaces requestAnimationFrame with a queue that only runs on `flushAnimationFrames()`. */
export function installAnimationFrames(): void {
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id);
  };
}

/** Runs every queued frame callback once (callbacks queued while running wait for the next flush). */
export function flushAnimationFrames(): void {
  const due = frames;
  frames = new Map();
  for (const callback of due.values()) callback(performance.now());
}

export function pendingAnimationFrames(): number {
  return frames.size;
}

/** A fake microphone stream whose tracks record being stopped. */
export function fakeStream(): MediaStream & { stoppedTracks: number } {
  const stream = {
    stoppedTracks: 0,
    getTracks: () => [{ stop: () => (stream.stoppedTracks += 1) }],
  };
  return stream as unknown as MediaStream & { stoppedTracks: number };
}

/** Sets `navigator.mediaDevices.getUserMedia` for one spec. */
export function stubGetUserMedia(implementation: () => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: implementation },
  });
}

/** Resolves pending promise callbacks (microtasks), e.g. after `await context.resume()`. */
export async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
