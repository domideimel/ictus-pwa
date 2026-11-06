import { spell } from './note';
import {
  CLEF_SETTINGS,
  bottomLine,
  clefFor,
  clefSettingTitle,
  clefTitle,
  placeOnStaff,
} from './staff';

describe('clefs', () => {
  it('splits the auto clef at middle C', () => {
    expect(clefFor('auto', 59)).toBe('bass');
    expect(clefFor('auto', 60)).toBe('treble');
    expect(clefFor('auto', undefined)).toBe('treble');
  });

  it('keeps a fixed clef for every note', () => {
    expect(clefFor('bass', 90)).toBe('bass');
    expect(clefFor('treble', 30)).toBe('treble');
  });

  it('titles clefs and settings', () => {
    expect(CLEF_SETTINGS.map(clefSettingTitle)).toEqual(['Auto', 'Bass', 'Treble']);
    expect(clefTitle('treble')).toBe('Treble clef');
    expect(clefTitle('bass')).toBe('Bass clef');
  });

  it('puts E4 on the bottom treble line and G2 on the bottom bass line', () => {
    expect(bottomLine('treble')).toBe(spell(64, 'sharps').diatonicIndex);
    expect(bottomLine('bass')).toBe(spell(43, 'sharps').diatonicIndex);
  });
});

describe('placement', () => {
  it('places notes on lines and spaces', () => {
    expect(placeOnStaff(spell(43, 'sharps'), 'bass').position).toBe(0);
    expect(placeOnStaff(spell(57, 'sharps'), 'bass').position).toBe(8);
    expect(placeOnStaff(spell(69, 'sharps'), 'treble')).toEqual({
      clef: 'treble',
      position: 3,
      ottava: 0,
      ledgerLines: [],
      ottavaLabel: null,
    });
  });

  it('adds ledger lines below and above the staff', () => {
    expect(placeOnStaff(spell(60, 'sharps'), 'treble').ledgerLines).toEqual([-2]);
    expect(placeOnStaff(spell(59, 'sharps'), 'treble').ledgerLines).toEqual([-2]);
    expect(placeOnStaff(spell(57, 'sharps'), 'treble').ledgerLines).toEqual([-2, -4]);
    expect(placeOnStaff(spell(81, 'sharps'), 'treble').ledgerLines).toEqual([10]);
    expect(placeOnStaff(spell(84, 'sharps'), 'treble').ledgerLines).toEqual([10, 12]);
  });

  it('switches to ottava signs for the extremes', () => {
    expect(placeOnStaff(spell(24, 'sharps'), 'bass')).toEqual(
      expect.objectContaining({ ottava: -1, position: -4, ottavaLabel: '8vb' }),
    );
    expect(placeOnStaff(spell(96, 'sharps'), 'treble').ottavaLabel).toBe('8va');
    expect(placeOnStaff(spell(108, 'sharps'), 'treble').ottavaLabel).toBe('15ma');
    expect(placeOnStaff(spell(0, 'sharps'), 'bass').ottavaLabel).toBe('15mb');
  });

  it('fits C1 to C8 on the staff in auto clef', () => {
    for (let midi = 24; midi <= 108; midi++) {
      const spelling = spell(midi, 'flats');
      const placement = placeOnStaff(spelling, clefFor('auto', midi));
      expect(placement.position).toBeGreaterThanOrEqual(-6);
      expect(placement.position).toBeLessThanOrEqual(13);
      expect(placement.position + placement.ottava * 7).toBe(
        spelling.diatonicIndex - bottomLine(placement.clef),
      );
    }
  });
});
