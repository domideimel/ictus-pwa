import { clamp } from './meter';

export const LUG_RANGE = { min: 3, max: 16 } as const;

/** Pitch at each tension rod of a drumhead, compared with the average of all lugs or a target note. */
export interface DrumTuning {
  readonly readings: readonly (number | null)[];
  readonly currentLug: number;
  /** Target pitch in Hz; null compares each lug with the average of the measured lugs. */
  readonly target: number | null;
}

export function emptyTuning(lugCount: number, target: number | null = null): DrumTuning {
  const count = clamp(Math.round(lugCount), LUG_RANGE.min, LUG_RANGE.max);
  return { readings: Array(count).fill(null), currentLug: 0, target };
}

/** Stores a strike for the current lug and moves on clockwise. */
export function recordStrike(tuning: DrumTuning, frequency: number): DrumTuning {
  const readings = tuning.readings.map((value, i) => (i === tuning.currentLug ? frequency : value));
  return { ...tuning, readings, currentLug: (tuning.currentLug + 1) % readings.length };
}

/** The pitch every lug is compared against: the target, or the average (in cents) of the measured lugs. */
export function referencePitch(tuning: DrumTuning): number | null {
  if (tuning.target !== null) return tuning.target;
  const measured = tuning.readings.filter((value): value is number => value !== null);
  if (measured.length === 0) return null;
  const meanLog = measured.reduce((sum, value) => sum + Math.log2(value), 0) / measured.length;
  return 2 ** meanLog;
}

/** Cents from the reference for each lug; null where not measured yet. */
export function deviations(tuning: DrumTuning): (number | null)[] {
  const reference = referencePitch(tuning);
  return tuning.readings.map((value) =>
    value === null || reference === null ? null : 1200 * Math.log2(value / reference),
  );
}

/** Spread between the highest and lowest lug in cents. */
export function spread(tuning: DrumTuning): number | null {
  const values = deviations(tuning).filter((value): value is number => value !== null);
  if (values.length < 2) return null;
  return Math.max(...values) - Math.min(...values);
}
