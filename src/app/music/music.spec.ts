import { deviations, emptyTuning, recordStrike, spread } from './drum-tuning';
import {
  BeatLevel,
  defaultGrouping,
  groupStarts,
  groupingOptions,
  nextLevel,
  tempoMarking,
} from './meter';
import { readNote, spell } from './note';
import { isGapBar, trainerTempo } from './practice';
import { bottomLine, clefFor, placeOnStaff } from './staff';

describe('notes', () => {
  it('measures cents against the reference', () => {
    const reading = readNote(99.13, 442);
    expect(spell(reading.midi, 'sharps').name).toBe('G');
    expect(spell(reading.midi, 'sharps').octave).toBe(2);
    expect(reading.cents).toBeCloseTo(12, 0);
    expect(Math.abs(reading.targetFrequency - 98.45)).toBeLessThan(0.01);
  });

  it('spells sharps and flats', () => {
    expect(spell(61, 'sharps').name).toBe('C♯');
    expect(spell(61, 'flats').name).toBe('D♭');
    expect(spell(70, 'flats').octave).toBe(4);
  });

  it('uses German names for B', () => {
    expect(spell(71, 'flats').name).toBe('H');
    expect(spell(70, 'flats').name).toBe('B');
    expect(spell(70, 'flats').accidental).toBe('flat');
    expect(spell(70, 'sharps').name).toBe('A♯');
  });
});

describe('staff', () => {
  it('splits the auto clef at middle C', () => {
    expect(clefFor('auto', 59)).toBe('bass');
    expect(clefFor('auto', 60)).toBe('treble');
    expect(clefFor('bass', 80)).toBe('bass');
  });

  it('places notes on lines and spaces', () => {
    expect(placeOnStaff(spell(43, 'sharps'), 'bass').position).toBe(0);
    const c4 = placeOnStaff(spell(60, 'sharps'), 'treble');
    expect(c4.position).toBe(-2);
    expect(c4.ledgerLines).toEqual([-2]);
    const a4 = placeOnStaff(spell(69, 'sharps'), 'treble');
    expect(a4.position).toBe(3);
    expect(a4.ledgerLines).toEqual([]);
  });

  it('uses ottava signs for the extremes', () => {
    const c1 = placeOnStaff(spell(24, 'sharps'), 'bass');
    expect(c1.ottava).toBe(-1);
    expect(c1.position).toBe(-4);
    expect(placeOnStaff(spell(108, 'sharps'), 'treble').ottavaLabel).toBe('15ma');
  });

  it('fits C1 to C7 on the staff', () => {
    for (let midi = 24; midi <= 96; midi++) {
      const spelling = spell(midi, 'sharps');
      const placement = placeOnStaff(spelling, clefFor('auto', midi));
      expect(placement.position).toBeGreaterThanOrEqual(-6);
      expect(placement.position).toBeLessThanOrEqual(13);
      expect(placement.position + placement.ottava * 7).toBe(
        spelling.diatonicIndex - bottomLine(placement.clef),
      );
    }
  });
});

describe('meter', () => {
  it('groups odd meters', () => {
    expect(groupingOptions({ beats: 7, unit: 8 })).toEqual([
      [2, 2, 3],
      [2, 3, 2],
      [3, 2, 2],
    ]);
    expect(defaultGrouping({ beats: 7, unit: 8 })).toEqual([2, 2, 3]);
    expect(defaultGrouping({ beats: 6, unit: 8 })).toEqual([3, 3]);
    expect(groupingOptions({ beats: 4, unit: 4 })).toEqual([]);
    expect([...groupStarts([2, 2, 3])]).toEqual([2, 4]);
  });

  it('names tempo markings', () => {
    expect(tempoMarking(120)).toBe('Allegro');
    expect(tempoMarking(50)).toBe('Largo');
    expect(tempoMarking(90)).toBe('Andante');
    expect(tempoMarking(180)).toBe('Presto');
  });

  it('cycles accent, normal, mute', () => {
    expect(nextLevel(BeatLevel.Accent)).toBe(BeatLevel.Normal);
    expect(nextLevel(BeatLevel.Normal)).toBe(BeatLevel.Mute);
    expect(nextLevel(BeatLevel.Mute)).toBe(BeatLevel.Accent);
  });
});

describe('practice tools', () => {
  it('mutes the gap bars', () => {
    expect(isGapBar({ enabled: true, play: 2, mute: 1 }, 2)).toBe(true);
    expect(isGapBar({ enabled: true, play: 2, mute: 1 }, 3)).toBe(false);
  });

  it('caps the speed trainer at the target', () => {
    expect(trainerTempo(100, 7, { enabled: true, step: 10, everyBars: 1, target: 120 })).toBe(120);
    expect(trainerTempo(100, 1, { enabled: true, step: 10, everyBars: 1, target: 120 })).toBe(110);
  });
});

describe('drum tuning', () => {
  it('compares lugs with their average', () => {
    let tuning = emptyTuning(4);
    for (const frequency of [200, 200, 200, 200 * 2 ** (20 / 1200)])
      tuning = recordStrike(tuning, frequency);
    expect(tuning.currentLug).toBe(0);
    const cents = deviations(tuning) as number[];
    expect(cents[3] - cents[0]).toBeCloseTo(20, 2);
    expect(cents.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0, 2);
    expect(spread(tuning)).toBeCloseTo(20, 2);
  });

  it('compares with a target', () => {
    let tuning = { ...emptyTuning(6, 220), currentLug: 2 };
    tuning = recordStrike(tuning, 220 * 2 ** (-10 / 1200));
    expect(tuning.currentLug).toBe(3);
    expect(deviations(tuning)[2]).toBeCloseTo(-10, 2);
    expect(deviations(tuning)[0]).toBeNull();
  });
});
