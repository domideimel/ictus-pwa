import { BeatLevel } from '../music/meter';
import {
  GapClick,
  Polyrhythm,
  SpeedTrainer,
  isGapBar,
  polyrhythmCycle,
  trainerTempo,
} from '../music/practice';
import { ClickKind } from './click-synth';

/** Everything the scheduler reads on each tick; the metronome store replaces it whenever a setting changes. */
export interface ClickParams {
  readonly bpm: number;
  readonly levels: readonly BeatLevel[];
  readonly groupStarts: ReadonlySet<number>;
  readonly subdivision: number;
  /** Share of a pair of eighths/sixteenths taken by the first note: 0.5 straight, 0.667 triplet swing. */
  readonly swing: number;
  readonly gap: GapClick;
  readonly trainer: SpeedTrainer;
  readonly polyrhythm: Polyrhythm;
  /** Keeps counting but plays nothing (rest counter). */
  readonly silent: boolean;
  readonly accentVolume: number;
  readonly beatVolume: number;
  readonly subdivisionVolume: number;
}

export interface ScheduledClick {
  readonly time: number;
  readonly kind: ClickKind;
  readonly gain: number;
}

export interface ScheduledBeat {
  readonly time: number;
  readonly index: number;
  /** Bars completed since start (0 during the first bar). */
  readonly bar: number;
}

/**
 * Turns the metronome settings into click times on the audio clock. Has no Web Audio dependency, so the
 * timing is unit-tested exactly; the engine calls `advance` a little ahead of the playhead.
 */
export class ClickScheduler {
  private nextTick: number;
  private beatIndex = 0;
  private subIndex = 0;
  private bar = 0;
  private beatsSinceStart = 0;
  private polyRemaining = 0;
  private polyInterval = 0;
  private nextPoly = 0;

  constructor(startTime: number) {
    this.nextTick = startTime;
  }

  /** Schedules every click before `until` (seconds on the audio clock). */
  advance(
    until: number,
    params: ClickParams,
  ): { clicks: ScheduledClick[]; beats: ScheduledBeat[] } {
    const clicks: ScheduledClick[] = [];
    const beats: ScheduledBeat[] = [];
    for (;;) {
      const polyDue = this.polyRemaining > 0 && this.nextPoly < this.nextTick;
      const next = polyDue ? this.nextPoly : this.nextTick;
      if (next >= until) break;
      if (polyDue) this.polyTick(params, clicks);
      else this.tick(params, clicks, beats);
    }
    return { clicks, beats };
  }

  private tick(params: ClickParams, clicks: ScheduledClick[], beats: ScheduledBeat[]): void {
    const subdivisions = Math.max(1, params.subdivision);
    const beatCount = Math.max(1, Math.min(16, params.levels.length));
    if (this.subIndex >= subdivisions) {
      this.subIndex = 0;
      this.beatIndex += 1;
    }
    if (this.beatIndex >= beatCount) {
      this.beatIndex = 0;
      this.bar += 1;
    }

    const bpm = trainerTempo(params.bpm, this.bar, params.trainer);
    const beatSeconds = 60 / Math.max(bpm, 1);
    const level = params.levels[this.beatIndex] ?? BeatLevel.Normal;
    const time = this.nextTick;
    const muted = level === BeatLevel.Mute || params.silent || isGapBar(params.gap, this.bar);

    if (this.subIndex === 0) {
      this.startPolyCycleIfNeeded(beatSeconds, params.polyrhythm, time);
      this.beatsSinceStart += 1;
      beats.push({ time, index: this.beatIndex, bar: this.bar });
      if (!muted) {
        const isGroupStart = this.beatIndex !== 0 && params.groupStarts.has(this.beatIndex);
        if (level === BeatLevel.Accent)
          clicks.push({ time, kind: 'accent', gain: params.accentVolume });
        else if (isGroupStart)
          clicks.push({ time, kind: 'accent', gain: params.accentVolume * 0.6 });
        else clicks.push({ time, kind: 'beat', gain: params.beatVolume });
      }
    } else if (!muted) {
      clicks.push({ time, kind: 'subdivision', gain: params.subdivisionVolume });
    }

    this.nextTick += this.tickLength(beatSeconds, subdivisions, params.swing);
    this.subIndex += 1;
  }

  /** Straight: beat / subdivisions. Swung pairs: long-short, the pair keeps its total length so nothing drifts. */
  private tickLength(beatSeconds: number, subdivisions: number, swing: number): number {
    const straight = beatSeconds / subdivisions;
    if ((subdivisions !== 2 && subdivisions !== 4) || swing <= 0.5) return straight;
    return 2 * straight * (this.subIndex % 2 === 0 ? swing : 1 - swing);
  }

  /** Every `beats` beats, the polyrhythm's clicks are spread evenly over that span. */
  private startPolyCycleIfNeeded(beatSeconds: number, polyrhythm: Polyrhythm, time: number): void {
    const cycle = polyrhythmCycle(polyrhythm);
    if (!cycle) {
      this.polyRemaining = 0;
      return;
    }
    if (this.beatsSinceStart % cycle.beats !== 0) return;
    this.polyRemaining = cycle.clicks;
    this.polyInterval = (beatSeconds * cycle.beats) / cycle.clicks;
    this.nextPoly = time;
  }

  private polyTick(params: ClickParams, clicks: ScheduledClick[]): void {
    const time = this.nextPoly;
    this.polyRemaining -= 1;
    this.nextPoly += this.polyInterval;
    if (params.silent || isGapBar(params.gap, this.bar)) return;
    clicks.push({ time, kind: 'poly', gain: params.beatVolume });
  }
}
