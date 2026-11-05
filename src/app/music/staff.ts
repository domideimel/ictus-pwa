import { NoteSpelling } from './note';

export type ClefSetting = 'auto' | 'bass' | 'treble';
export type Clef = 'treble' | 'bass';

export const CLEF_SETTINGS: readonly ClefSetting[] = ['auto', 'bass', 'treble'];

export const clefSettingTitle = (setting: ClefSetting): string =>
  setting === 'auto' ? 'Auto' : setting === 'bass' ? 'Bass' : 'Treble';

export const clefTitle = (clef: Clef): string => (clef === 'treble' ? 'Treble clef' : 'Bass clef');

/** Auto puts everything below C4 in bass clef, C4 and up in treble clef. */
export function clefFor(setting: ClefSetting, midi: number | undefined): Clef {
  if (setting !== 'auto') return setting;
  return (midi ?? 60) < 60 ? 'bass' : 'treble';
}

/** Diatonic index (octave * 7 + letter) of the bottom staff line: E4 in treble, G2 in bass. */
export const bottomLine = (clef: Clef): number => (clef === 'treble' ? 4 * 7 + 2 : 2 * 7 + 4);

/** Highest and lowest positions drawn before switching to an ottava sign. */
const HIGHEST_POSITION = 13;
const LOWEST_POSITION = -6;

/** Where a note sits on a five-line staff. Position 0 is the bottom line, each step is a line or space. */
export interface StaffPlacement {
  readonly clef: Clef;
  readonly position: number;
  /** +1 = 8va, +2 = 15ma, -1 = 8vb, -2 = 15mb */
  readonly ottava: number;
  readonly ledgerLines: readonly number[];
  readonly ottavaLabel: string | null;
}

export function placeOnStaff(spelling: NoteSpelling, clef: Clef): StaffPlacement {
  let position = spelling.diatonicIndex - bottomLine(clef);
  let ottava = 0;
  while (position > HIGHEST_POSITION) {
    position -= 7;
    ottava += 1;
  }
  while (position < LOWEST_POSITION) {
    position += 7;
    ottava -= 1;
  }
  return {
    clef,
    position,
    ottava,
    ledgerLines: ledgerLines(position),
    ottavaLabel: ottavaLabel(ottava),
  };
}

function ledgerLines(position: number): number[] {
  const lines: number[] = [];
  if (position <= -2) for (let line = -2; line >= position; line -= 2) lines.push(line);
  if (position >= 10) for (let line = 10; line <= position; line += 2) lines.push(line);
  return lines;
}

function ottavaLabel(ottava: number): string | null {
  if (ottava === 1) return '8va';
  if (ottava >= 2) return '15ma';
  if (ottava === -1) return '8vb';
  if (ottava <= -2) return '15mb';
  return null;
}
