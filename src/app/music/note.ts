export type AccidentalStyle = 'sharps' | 'flats';
export type Accidental = 'natural' | 'sharp' | 'flat';

export const accidentalSymbol = (accidental: Accidental): string =>
  accidental === 'sharp' ? '♯' : accidental === 'flat' ? '♭' : '';

/** German note names: B natural is H. */
const LETTERS = 'CDEFGAH';

// Letter index and accidental for each pitch class, spelled with sharps or flats.
const SHARPS: readonly [number, Accidental][] = [
  [0, 'natural'],
  [0, 'sharp'],
  [1, 'natural'],
  [1, 'sharp'],
  [2, 'natural'],
  [3, 'natural'],
  [3, 'sharp'],
  [4, 'natural'],
  [4, 'sharp'],
  [5, 'natural'],
  [5, 'sharp'],
  [6, 'natural'],
];
const FLATS: readonly [number, Accidental][] = [
  [0, 'natural'],
  [1, 'flat'],
  [1, 'natural'],
  [2, 'flat'],
  [2, 'natural'],
  [3, 'natural'],
  [4, 'flat'],
  [4, 'natural'],
  [5, 'flat'],
  [5, 'natural'],
  [6, 'flat'],
  [6, 'natural'],
];

export interface NoteSpelling {
  /** 0 = C … 6 = H */
  readonly letter: number;
  readonly accidental: Accidental;
  readonly octave: number;
  /** German B already means B♭, so H♭ is written as plain B. */
  readonly letterName: string;
  /** Accidental written after the name; the staff still draws `accidental`. */
  readonly nameAccidental: Accidental;
  readonly name: string;
  readonly diatonicIndex: number;
}

export function spell(midi: number, style: AccidentalStyle): NoteSpelling {
  const pitchClass = ((midi % 12) + 12) % 12;
  const [letter, accidental] = (style === 'sharps' ? SHARPS : FLATS)[pitchClass] ?? [0, 'natural'];
  const octave = Math.floor(midi / 12) - 1;
  const germanB = letter === 6 && accidental === 'flat';
  const letterName = germanB ? 'B' : LETTERS.charAt(letter);
  const nameAccidental = germanB ? 'natural' : accidental;
  return {
    letter,
    accidental,
    octave,
    letterName,
    nameAccidental,
    name: letterName + accidentalSymbol(nameAccidental),
    diatonicIndex: octave * 7 + letter,
  };
}

/** A detected pitch relative to the nearest equal-tempered note. */
export interface NoteReading {
  readonly frequency: number;
  readonly midi: number;
  readonly cents: number;
  readonly targetFrequency: number;
}

export function readNote(frequency: number, reference: number): NoteReading {
  const exact = 69 + 12 * Math.log2(frequency / reference);
  const midi = Math.round(exact);
  return {
    frequency,
    midi,
    cents: (exact - midi) * 100,
    targetFrequency: reference * 2 ** ((midi - 69) / 12),
  };
}

export const midiFrequency = (midi: number, reference: number): number =>
  reference * 2 ** ((midi - 69) / 12);
