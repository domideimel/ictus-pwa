import type { ClickKind, ClickSound } from './click-synth';
import { CLICK_SOUNDS, synthesizeClick } from './click-synth';
import type { ClickParams, ScheduledBeat } from './click-scheduler';
import { ClickScheduler } from './click-scheduler';
import { sharedAudioContext } from './audio-context';

/** Seconds of audio scheduled ahead of the playhead; the ticker wakes every 25 ms. */
const LOOKAHEAD = 0.12;
/** First click a moment after start, so the very first beat is never cut short. */
const START_DELAY = 0.06;

const KINDS: readonly ClickKind[] = ['accent', 'beat', 'subdivision', 'poly'];

/**
 * Plays the click with Web Audio. A worker ticker keeps scheduling ahead even in a background tab;
 * beats are reported once they are actually audible, so the lights match what you hear.
 */
export class MetronomeEngine {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private scheduler: ClickScheduler | null = null;
  private ticker: Worker | null = null;
  private pendingBeats: ScheduledBeat[] = [];
  private frame = 0;
  private sources = new Set<AudioBufferSourceNode>();

  constructor(
    private readonly params: () => ClickParams,
    private readonly sound: () => ClickSound,
    private readonly onBeat: (beat: ScheduledBeat) => void,
  ) {}

  get isRunning(): boolean {
    return this.scheduler !== null;
  }

  /** Must be called from a user gesture the first time (autoplay rules). */
  async start(): Promise<void> {
    if (this.scheduler) return;
    const context = sharedAudioContext();
    this.context = context;
    if (context.state !== 'running') await context.resume();
    // A second start while the context was resuming may have won the race.
    if (this.isRunning) return;
    this.prepareBuffers(context);
    this.scheduler = new ClickScheduler(context.currentTime + START_DELAY);
    this.pendingBeats = [];
    this.ticker ??= this.createTicker();
    this.ticker.postMessage('start');
    this.schedule();
    this.frame = requestAnimationFrame(this.reportBeats);
  }

  stop(): void {
    if (!this.scheduler) return;
    this.scheduler = null;
    this.ticker?.postMessage('stop');
    cancelAnimationFrame(this.frame);
    this.pendingBeats = [];
    for (const source of this.sources) source.stop();
    this.sources.clear();
  }

  dispose(): void {
    this.stop();
    this.ticker?.terminate();
    this.ticker = null;
  }

  private createTicker(): Worker {
    const worker = new Worker(new URL('./ticker.worker', import.meta.url), { type: 'module' });
    worker.onmessage = () => {
      this.schedule();
    };
    return worker;
  }

  private prepareBuffers(context: AudioContext): void {
    if (
      this.buffers.size > 0 &&
      this.buffers.values().next().value?.sampleRate === context.sampleRate
    )
      return;
    this.buffers.clear();
    for (const { value: sound } of CLICK_SOUNDS) {
      for (const kind of KINDS) {
        const samples = synthesizeClick(sound, kind, context.sampleRate);
        const buffer = context.createBuffer(1, samples.length, context.sampleRate);
        buffer.copyToChannel(samples, 0);
        this.buffers.set(`${sound}:${kind}`, buffer);
      }
    }
  }

  private schedule(): void {
    const context = this.context;
    if (!this.scheduler || !context) return;
    const { clicks, beats } = this.scheduler.advance(
      context.currentTime + LOOKAHEAD,
      this.params(),
    );
    const sound = this.sound();
    for (const click of clicks) {
      if (click.gain <= 0) continue;
      const buffer = this.buffers.get(`${sound}:${click.kind}`);
      if (!buffer) continue;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = click.gain;
      source.connect(gain).connect(context.destination);
      source.onended = () => this.sources.delete(source);
      this.sources.add(source);
      source.start(Math.max(click.time, context.currentTime));
    }
    this.pendingBeats.push(...beats);
  }

  /** Compares each scheduled beat with the time that is coming out of the speaker right now. */
  private readonly reportBeats = (): void => {
    const context = this.context;
    if (!this.scheduler || !context) return;
    const playing = audibleTime(context);
    let next = this.pendingBeats[0];
    while (next && next.time <= playing) {
      this.pendingBeats.shift();
      this.onBeat(next);
      next = this.pendingBeats[0];
    }
    this.frame = requestAnimationFrame(this.reportBeats);
  };
}

function audibleTime(context: AudioContext): number {
  // Safari before 14.1 has no getOutputTimestamp.
  const stamp = 'getOutputTimestamp' in context ? context.getOutputTimestamp() : undefined;
  if (stamp?.contextTime !== undefined && stamp.contextTime > 0) return stamp.contextTime;
  return context.currentTime - (context.outputLatency || context.baseLatency || 0);
}
