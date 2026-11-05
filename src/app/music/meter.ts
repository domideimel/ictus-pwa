/** A time signature such as 4/4 or 7/8. Each `unit` note gets one click. */
export interface TimeSignature {
  readonly beats: number;
  readonly unit: number;
}

export const BEAT_RANGE = { min: 1, max: 16 } as const;
export const BEAT_UNITS = [2, 4, 8, 16] as const;

export const QUICK_PICKS: readonly TimeSignature[] = [
  { beats: 2, unit: 4 },
  { beats: 3, unit: 4 },
  { beats: 4, unit: 4 },
  { beats: 5, unit: 4 },
  { beats: 6, unit: 8 },
  { beats: 7, unit: 8 },
  { beats: 9, unit: 8 },
  { beats: 12, unit: 8 },
];

export const signatureLabel = (signature: TimeSignature): string =>
  `${signature.beats}/${signature.unit}`;

export const sameSignature = (a: TimeSignature, b: TimeSignature): boolean =>
  a.beats === b.beats && a.unit === b.unit;

export const isValidSignature = (signature: TimeSignature): boolean =>
  Number.isInteger(signature.beats) &&
  signature.beats >= BEAT_RANGE.min &&
  signature.beats <= BEAT_RANGE.max &&
  (BEAT_UNITS as readonly number[]).includes(signature.unit);

/** Ways to split the bar into groups of 2 and 3, e.g. 7/8 = 2+2+3. Empty for simple meters. */
export function groupingOptions({ beats, unit }: TimeSignature): number[][] {
  if (beats < 5 || !(unit >= 8 || beats % 2 === 1)) return [];
  const result: number[][] = [];
  const build = (remaining: number, current: number[]): void => {
    if (remaining === 0) {
      result.push(current);
      return;
    }
    for (const part of [2, 3]) {
      if (part <= remaining) build(remaining - part, [...current, part]);
    }
  };
  build(beats, []);
  result.sort((a, b) => (a.length !== b.length ? a.length - b.length : compareLexicographic(a, b)));
  return result.slice(0, 6);
}

export function defaultGrouping(signature: TimeSignature): number[] {
  const options = groupingOptions(signature);
  if (options.length === 0) return [signature.beats];
  if (signature.unit >= 8 && signature.beats % 3 === 0) return Array(signature.beats / 3).fill(3);
  if (signature.beats === 5) return [3, 2];
  return options[0];
}

/** Indices of beats that start a group (other than beat 1), e.g. beats 2 and 4 for 7/8 = 2+2+3. */
export function groupStarts(grouping: readonly number[]): Set<number> {
  const starts = new Set<number>();
  if (grouping.length <= 1) return starts;
  let index = 0;
  for (const size of grouping.slice(0, -1)) {
    index += size;
    starts.add(index);
  }
  return starts;
}

function compareLexicographic(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

export type Subdivision = 1 | 2 | 3 | 4 | 5 | 6;

export interface SubdivisionInfo {
  readonly value: Subdivision;
  readonly title: string;
  readonly symbol: string;
  /** Tuplet number shown next to the symbol. */
  readonly tuplet?: number;
}

export const SUBDIVISIONS: readonly SubdivisionInfo[] = [
  { value: 1, title: 'Quarter', symbol: '♩' },
  { value: 2, title: 'Eighth', symbol: '♫' },
  { value: 3, title: 'Triplet', symbol: '♪♪♪', tuplet: 3 },
  { value: 4, title: '16th', symbol: '♬' },
  { value: 5, title: 'Quintuplet', symbol: '♬', tuplet: 5 },
  { value: 6, title: 'Sextuplet', symbol: '♬', tuplet: 6 },
];

export const subdivisionInfo = (value: Subdivision): SubdivisionInfo =>
  SUBDIVISIONS.find((info) => info.value === value) ?? SUBDIVISIONS[0];

/** Swing applies to pairs of eighths or sixteenths. */
export const canSwing = (value: Subdivision): boolean => value === 2 || value === 4;

/** Per-beat accent state. Tapping a beat dot cycles accent → normal → mute. */
export enum BeatLevel {
  Normal = 0,
  Accent = 1,
  Mute = 2,
}

export function nextLevel(level: BeatLevel): BeatLevel {
  switch (level) {
    case BeatLevel.Accent:
      return BeatLevel.Normal;
    case BeatLevel.Normal:
      return BeatLevel.Mute;
    case BeatLevel.Mute:
      return BeatLevel.Accent;
  }
}

export const levelTitle = (level: BeatLevel): string =>
  level === BeatLevel.Accent ? 'accent' : level === BeatLevel.Mute ? 'muted' : 'normal';

export const defaultLevels = (beats: number): BeatLevel[] =>
  Array.from({ length: beats }, (_, i) => (i === 0 ? BeatLevel.Accent : BeatLevel.Normal));

export function tempoMarking(bpm: number): string {
  if (bpm < 40) return 'Grave';
  if (bpm < 60) return 'Largo';
  if (bpm < 66) return 'Larghetto';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 168) return 'Allegro';
  if (bpm < 200) return 'Presto';
  return 'Prestissimo';
}

export const BPM_RANGE = { min: 20, max: 300 } as const;
/** 0.5 = straight, 0.667 = triplet feel, 0.75 = dotted. */
export const SWING_RANGE = { min: 0.5, max: 0.75 } as const;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
