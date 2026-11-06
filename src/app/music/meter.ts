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
  if (signature.unit >= 8 && signature.beats % 3 === 0)
    return Array.from({ length: signature.beats / 3 }, () => 3);
  if (signature.beats === 5) return [3, 2];
  return options[0] ?? [signature.beats];
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
  for (const [i, value] of a.entries()) {
    const other = b[i];
    if (other === undefined) break;
    if (value !== other) return value - other;
  }
  return a.length - b.length;
}

/**
 * What one count of the bar is. `unit`: every note of the time signature (11 counts in 11/8).
 * `group`: every group of the grouping, so 11/8 as 3+3+3+2 has four uneven counts.
 */
export type Pulse = 'unit' | 'group';

/** Groups only make sense where the meter offers a grouping (compound and odd meters). */
export const canCountInGroups = (signature: TimeSignature, grouping: readonly number[]): boolean =>
  groupingOptions(signature).length > 0 && grouping.length > 1;

/** Length of every count in notes of the time signature: `[1, 1, …]`, or the grouping when counting in groups. */
export function beatLengths(
  signature: TimeSignature,
  grouping: readonly number[],
  pulse: Pulse,
): number[] {
  if (pulse === 'group' && canCountInGroups(signature, grouping)) return [...grouping];
  return Array.from({ length: signature.beats }, () => 1);
}

/**
 * How many notes of the time signature the BPM counts. Even counts are the beat (♩. = 60 in 6/8 counted
 * in two); uneven counts such as 3+3+3+2 have no single beat length, so the BPM stays on the note (♪ = 240),
 * the usual tempo marking for odd meters.
 */
export function tempoUnits(lengths: readonly number[]): number {
  const first = lengths[0] ?? 1;
  return lengths.every((length) => length === first) ? first : 1;
}

/** Clicks per note of the time signature; 0 plays only the counts (groups) themselves. */
export type Subdivision = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface SubdivisionInfo {
  readonly value: Subdivision;
  readonly title: string;
  readonly symbol: string;
  /** Tuplet number shown next to the symbol. */
  readonly tuplet?: number;
}

const NOTE_NAMES: Readonly<Record<number, string>> = {
  1: 'Whole',
  2: 'Half',
  4: 'Quarter',
  8: 'Eighth',
  16: '16th',
  32: '32nd',
  64: '64th',
};

const NOTE_SYMBOLS: Readonly<Record<number, string>> = {
  1: '\u{1D15D}',
  2: '\u{1D15E}',
  4: '♩',
  8: '♪',
  16: '\u{1D161}',
  32: '\u{1D162}',
  64: '\u{1D163}',
};

/** Beamed glyphs for a run of eighths or sixteenths, a single note for everything else. */
const BEAMED_SYMBOLS: Readonly<Record<number, string>> = { 8: '♫', 16: '♬' };

const noteSymbol = (note: number): string => NOTE_SYMBOLS[note] ?? '♩';
const noteName = (note: number): string => NOTE_NAMES[note] ?? `1/${note}`;

/** A duration of `units` notes of the time signature as one note, dotted if need be: 3 eighths → ♩. */
function asNote(units: number, unit: number): { note: number; dotted: boolean } {
  const dotted = units % 3 === 0;
  const base = dotted ? (units / 3) * 2 : units;
  return { note: unit / base, dotted };
}

export function durationSymbol(units: number, unit: number): string {
  const { note, dotted } = asNote(units, unit);
  return noteSymbol(note) + (dotted ? '.' : '');
}

/** E.g. "dotted quarter" for three eighths. */
export function durationTitle(units: number, unit: number): string {
  const { note, dotted } = asNote(units, unit);
  return `${dotted ? 'dotted ' : ''}${noteName(note).toLowerCase()}`;
}

const UNIT_SUBDIVISIONS: readonly Subdivision[] = [1, 2, 3, 4, 5, 6];
/** Counting in groups: the groups alone, then divisions of every note; quintuplets don't fit the feel. */
const GROUP_SUBDIVISIONS: readonly Subdivision[] = [0, 1, 2, 3, 4, 6];

/**
 * The subdivisions for a meter, named after the notes they actually play. Every option divides the note
 * of the time signature, so it fits any grouping: in 11/8 "Eighth" is the eleven eighths, "16th" twenty-two.
 */
export function subdivisionOptions(unit: number, lengths: readonly number[]): SubdivisionInfo[] {
  const grouped = lengths.some((length) => length > 1);
  return (grouped ? GROUP_SUBDIVISIONS : UNIT_SUBDIVISIONS).map((value) =>
    describeSubdivision(value, unit, lengths),
  );
}

function describeSubdivision(
  value: Subdivision,
  unit: number,
  lengths: readonly number[],
): SubdivisionInfo {
  switch (value) {
    case 0: {
      const distinct = [...new Set(lengths)];
      return {
        value,
        title: 'Beat',
        symbol: distinct.map((length) => durationSymbol(length, unit)).join(''),
      };
    }
    case 1:
      return { value, title: noteName(unit), symbol: noteSymbol(unit) };
    case 2:
    case 4: {
      const note = unit * value;
      return { value, title: noteName(note), symbol: BEAMED_SYMBOLS[note] ?? noteSymbol(note) };
    }
    case 3:
      return { value, title: 'Triplet', symbol: '♪♪♪', tuplet: 3 };
    case 5:
      return { value, title: 'Quintuplet', symbol: '♬', tuplet: 5 };
    case 6:
      return { value, title: 'Sextuplet', symbol: '♬', tuplet: 6 };
  }
}

/** The option for `value`, or the plain note of the meter when `value` isn't offered there. */
export function subdivisionInfo(
  value: Subdivision,
  unit: number,
  lengths: readonly number[],
): SubdivisionInfo {
  const options = subdivisionOptions(unit, lengths);
  return options.find((info) => info.value === value) ?? describeSubdivision(1, unit, lengths);
}

/**
 * The subdivision that plays the same notes in a meter with another note value: eighths in 4/4 (two per
 * quarter) stay eighths in 11/8 (one per eighth) instead of turning into sixteenths. Tuplets stay tuplets
 * of the new note; a note shorter or longer than the meter offers falls back to the meter's note.
 */
export function keepNoteValue(value: Subdivision, fromUnit: number, toUnit: number): Subdivision {
  if (value !== 1 && value !== 2 && value !== 4) return value === 0 ? 1 : value;
  const perNote = (value * fromUnit) / toUnit;
  return perNote === 1 || perNote === 2 || perNote === 4 ? perNote : 1;
}

/** Swing applies to pairs: two or four clicks per note (eighths or sixteenths in 4/4). */
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
