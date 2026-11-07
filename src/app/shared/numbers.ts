/** An inclusive range of allowed values, e.g. `BPM_RANGE`. */
export interface NumberRange {
  readonly min: number;
  readonly max: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** The nearest whole number inside `range`. */
export const wholeIn = (value: number, range: NumberRange): number =>
  clamp(Math.round(value), range.min, range.max);
