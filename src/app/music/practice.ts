/** Play N bars, mute N bars to train inner time. */
export interface GapClick {
  readonly enabled: boolean;
  readonly play: number;
  readonly mute: number;
}

/** Raise the tempo by a step every N bars up to a target. */
export interface SpeedTrainer {
  readonly enabled: boolean;
  readonly step: number;
  readonly everyBars: number;
  readonly target: number;
}

/** Second click voice against the beat: `clicks` even clicks across `clicks - 1` beats, e.g. 3:2. */
export type Polyrhythm = 'off' | '3:2' | '4:3' | '5:4';

export const POLYRHYTHMS: readonly Polyrhythm[] = ['off', '3:2', '4:3', '5:4'];

export const GAP_BAR_RANGE = { min: 1, max: 16 } as const;
export const TRAINER_STEP_RANGE = { min: 1, max: 20 } as const;
export const TRAINER_BAR_RANGE = { min: 1, max: 32 } as const;
export const REST_BAR_RANGE = { min: 1, max: 999 } as const;

export const DEFAULT_GAP_CLICK: GapClick = { enabled: false, play: 2, mute: 2 };
export const DEFAULT_SPEED_TRAINER: SpeedTrainer = {
  enabled: false,
  step: 4,
  everyBars: 4,
  target: 160,
};

export function polyrhythmCycle(poly: Polyrhythm): { clicks: number; beats: number } | null {
  if (poly === 'off') return null;
  const clicks = Number(poly[0]);
  return { clicks, beats: clicks - 1 };
}

export const isGapBar = (gap: GapClick, bar: number): boolean =>
  gap.enabled && gap.play > 0 && gap.mute > 0 && bar % (gap.play + gap.mute) >= gap.play;

/** Tempo of a bar with the speed trainer applied. */
export function trainerTempo(base: number, bar: number, trainer: SpeedTrainer): number {
  if (!trainer.enabled || trainer.step <= 0 || trainer.everyBars <= 0 || trainer.target <= base)
    return base;
  return Math.min(trainer.target, base + trainer.step * Math.floor(bar / trainer.everyBars));
}

export const gapSummary = (gap: GapClick): string => `Gap ${gap.play} on · ${gap.mute} off`;

export const trainerSummary = (trainer: SpeedTrainer): string =>
  `+${trainer.step} every ${trainer.everyBars} bars → ${trainer.target}`;

/** Active rest counter: counts bars silently (or audibly) and signals the entrance. */
export interface RestState {
  readonly bars: number;
  readonly audible: boolean;
  readonly finished: boolean;
}
