import { DestroyRef, Service, computed, inject, signal, untracked } from '@angular/core';
import { ClickParams, ScheduledBeat } from '../audio/click-scheduler';
import { setAudioSession } from '../audio/audio-context';
import { MetronomeEngine } from '../audio/metronome-engine';
import {
  BPM_RANGE,
  BeatLevel,
  SWING_RANGE,
  Subdivision,
  TimeSignature,
  clamp,
  defaultGrouping,
  defaultLevels,
  groupStarts,
  isValidSignature,
  nextLevel,
  sameSignature,
  tempoMarking,
} from '../music/meter';
import {
  DEFAULT_GAP_CLICK,
  DEFAULT_SPEED_TRAINER,
  GapClick,
  Polyrhythm,
  RestCounter,
  SpeedTrainer,
  isGapBar,
  trainerTempo,
} from '../music/practice';
import { SettingsStore } from './settings.store';
import { Parser, persistedSignal, withDefaults } from './storage';

/** What a saved piece stores, and what the metronome screen edits. */
export interface MetronomeSetup {
  readonly bpm: number;
  readonly timeSignature: TimeSignature;
  readonly grouping: readonly number[];
  readonly levels: readonly BeatLevel[];
  readonly subdivision: Subdivision;
  readonly swing: number;
}

/** Practice tools behind the dumbbell button; edited by the practice sheet's signal form. */
export interface PracticeSetup {
  readonly gapClick: GapClick;
  readonly speedTrainer: SpeedTrainer;
  readonly polyrhythm: Polyrhythm;
  readonly restBars: number;
  readonly restAudible: boolean;
}

const DEFAULT_SETUP: MetronomeSetup = {
  bpm: 120,
  timeSignature: { beats: 4, unit: 4 },
  grouping: [4],
  levels: defaultLevels(4),
  subdivision: 1,
  swing: 0.5,
};

export const DEFAULT_PRACTICE: PracticeSetup = {
  gapClick: DEFAULT_GAP_CLICK,
  speedTrainer: DEFAULT_SPEED_TRAINER,
  polyrhythm: 'off',
  restBars: 8,
  restAudible: false,
};

/** Fixes anything that no longer fits together, e.g. a grouping saved for another meter. */
export function sanitizeSetup(setup: MetronomeSetup): MetronomeSetup {
  const timeSignature = isValidSignature(setup.timeSignature)
    ? setup.timeSignature
    : DEFAULT_SETUP.timeSignature;
  const grouping =
    setup.grouping.reduce((sum, size) => sum + size, 0) === timeSignature.beats
      ? setup.grouping
      : defaultGrouping(timeSignature);
  const levels =
    setup.levels.length === timeSignature.beats && setup.levels.every((level) => level in BeatLevel)
      ? setup.levels
      : defaultLevels(timeSignature.beats);
  return {
    bpm: clamp(Math.round(setup.bpm) || DEFAULT_SETUP.bpm, BPM_RANGE.min, BPM_RANGE.max),
    timeSignature,
    grouping,
    levels,
    subdivision: ([1, 2, 3, 4, 5, 6] as const).find((value) => value === setup.subdivision) ?? 1,
    swing: clamp(setup.swing, SWING_RANGE.min, SWING_RANGE.max),
  };
}

const parseSetup: Parser<MetronomeSetup> = (value) => {
  const merged = withDefaults(DEFAULT_SETUP)(value);
  return merged ? sanitizeSetup(merged) : null;
};

@Service()
export class MetronomeStore {
  private readonly settings = inject(SettingsStore);

  readonly setup = persistedSignal('metronome', DEFAULT_SETUP, parseSetup);
  readonly practice = persistedSignal('practice', DEFAULT_PRACTICE, withDefaults(DEFAULT_PRACTICE));

  readonly bpm = computed(() => this.setup().bpm);
  readonly timeSignature = computed(() => this.setup().timeSignature);
  readonly grouping = computed(() => this.setup().grouping);
  readonly levels = computed(() => this.setup().levels);
  readonly subdivision = computed(() => this.setup().subdivision);
  readonly swing = computed(() => this.setup().swing);
  readonly groupStarts = computed(() => groupStarts(this.grouping()));
  readonly tempoMarking = computed(() => tempoMarking(this.bpm()));

  private readonly playing = signal(false);
  private readonly beat = signal<number | null>(null);
  private readonly bar = signal(0);
  private readonly downbeats = signal(0);
  private readonly restCounter = signal<RestCounter | null>(null);

  readonly isPlaying = this.playing.asReadonly();
  /** Beat currently sounding, reported once it is audible so the light matches what you hear. */
  readonly currentBeat = this.beat.asReadonly();
  /** Bars completed since start (0 during the first bar). */
  readonly currentBar = this.bar.asReadonly();
  /** Increments on every audible downbeat; drives the full-screen flash. */
  readonly downbeatCount = this.downbeats.asReadonly();
  readonly rest = this.restCounter.asReadonly();

  /** Tempo of the bar that is playing, with the speed trainer applied. */
  readonly currentTempo = computed(() => {
    const trainer = this.practice().speedTrainer;
    if (!this.playing() || this.restCounter() || !trainer.enabled) return this.bpm();
    return Math.round(trainerTempo(this.bpm(), this.bar(), trainer));
  });

  /** True while the current bar is a muted bar of the gap click. */
  readonly isInGap = computed(
    () => this.playing() && !this.restCounter() && isGapBar(this.practice().gapClick, this.bar()),
  );

  /** Practice tools are paused while the rest counter runs. */
  private readonly clickParams = computed<ClickParams>(() => {
    const setup = this.setup();
    const practice = this.practice();
    const rest = this.restCounter();
    const settings = this.settings.settings();
    return {
      bpm: setup.bpm,
      levels: setup.levels,
      groupStarts: this.groupStarts(),
      subdivision: setup.subdivision,
      swing: setup.swing,
      gap: rest ? DEFAULT_GAP_CLICK : practice.gapClick,
      trainer: rest ? DEFAULT_SPEED_TRAINER : practice.speedTrainer,
      polyrhythm: rest ? 'off' : practice.polyrhythm,
      silent: rest !== null && !rest.audible,
      accentVolume: settings.accentVolume,
      beatVolume: settings.beatVolume,
      subdivisionVolume: settings.subdivisionVolume,
    };
  });

  private readonly engine = new MetronomeEngine(
    () => untracked(this.clickParams),
    () => untracked(this.settings.settings).clickSound,
    (beat) => this.showBeat(beat),
  );

  private tapTimes: number[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.engine.dispose());
  }

  // MARK: Editing

  setBpm(bpm: number): void {
    this.patch({ bpm: clamp(Math.round(bpm), BPM_RANGE.min, BPM_RANGE.max) });
  }

  nudge(delta: number): void {
    this.setBpm(this.bpm() + delta);
  }

  setTimeSignature(timeSignature: TimeSignature): void {
    if (!isValidSignature(timeSignature) || sameSignature(timeSignature, this.timeSignature()))
      return;
    this.patch({
      timeSignature,
      grouping: defaultGrouping(timeSignature),
      levels: defaultLevels(timeSignature.beats),
    });
  }

  setGrouping(grouping: readonly number[]): void {
    if (grouping.reduce((sum, size) => sum + size, 0) !== this.timeSignature().beats) return;
    this.patch({ grouping });
  }

  cycleLevel(index: number): void {
    this.patch({
      levels: this.levels().map((level, i) => (i === index ? nextLevel(level) : level)),
    });
  }

  setSubdivision(subdivision: Subdivision): void {
    this.patch({ subdivision });
  }

  setSwing(swing: number): void {
    this.patch({ swing: clamp(swing, SWING_RANGE.min, SWING_RANGE.max) });
  }

  /** Loads a saved piece; while playing, the change takes effect on the next click. */
  apply(setup: MetronomeSetup): void {
    this.setup.set(sanitizeSetup(setup));
  }

  /** Tap tempo: average interval of the last four taps; a pause over two seconds starts over. */
  tap(now = performance.now()): void {
    const last = this.tapTimes.at(-1);
    if (last !== undefined && now - last > 2000) this.tapTimes = [];
    this.tapTimes = [...this.tapTimes, now].slice(-5);
    if (this.tapTimes.length < 2) return;
    const average = (now - this.tapTimes[0]) / (this.tapTimes.length - 1);
    this.setBpm(60000 / average);
  }

  // MARK: Transport

  toggle(): void {
    if (this.playing()) this.stop();
    else void this.start();
  }

  async start(): Promise<void> {
    if (this.playing()) return;
    setAudioSession('playback');
    this.playing.set(true);
    this.bar.set(0);
    try {
      await this.engine.start();
      // Stopped again while the audio context was resuming.
      if (!this.playing()) this.engine.stop();
    } catch (error) {
      console.error('Metronome start failed', error);
      this.playing.set(false);
    }
  }

  stop(): void {
    if (!this.playing()) return;
    this.engine.stop();
    this.playing.set(false);
    this.beat.set(null);
  }

  // MARK: Rest counter

  /** Counts `bars` bars at the current tempo and meter, silently unless `audible`, then stops on the entrance. */
  startRest(bars: number, audible: boolean): void {
    this.stop();
    this.restCounter.set({ bars: Math.max(1, bars), audible, finished: false });
    void this.start();
  }

  endRest(): void {
    this.stop();
    this.restCounter.set(null);
  }

  // MARK: Private

  private patch(changes: Partial<MetronomeSetup>): void {
    this.setup.update((current) => ({ ...current, ...changes }));
  }

  private showBeat({ index, bar }: ScheduledBeat): void {
    const rest = this.restCounter();
    if (rest && !rest.finished && bar >= rest.bars) {
      this.finishRest(rest);
      return;
    }
    this.beat.set(index);
    this.bar.set(bar);
    const level = this.levels()[index] ?? BeatLevel.Normal;
    if (level === BeatLevel.Mute || this.isInGap()) return;
    if (index === 0) this.downbeats.update((count) => count + 1);
    if (this.settings.settings().vibration) {
      vibrate(index === 0 ? 35 : this.groupStarts().has(index) ? 20 : 12);
    }
  }

  /** The downbeat after the last rest bar is the entrance: stop and signal it. */
  private finishRest(rest: RestCounter): void {
    this.stop();
    this.restCounter.set({ ...rest, finished: true });
    this.downbeats.update((count) => count + 1);
    vibrate([60, 40, 60]);
  }
}

/** Android buzzes; iOS Safari has no vibration API, so this is a no-op there. */
function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}
