import { accidentalSymbol, midiFrequency, readNote, spell } from './note';

describe('spelling', () => {
  it.each([
    [60, 'sharps', 'C', 4],
    [61, 'sharps', 'C♯', 4],
    [61, 'flats', 'D♭', 4],
    [63, 'flats', 'E♭', 4],
    [66, 'sharps', 'F♯', 4],
    [69, 'sharps', 'A', 4],
    [70, 'sharps', 'A♯', 4],
    [70, 'flats', 'B', 4],
    [71, 'sharps', 'H', 4],
    [71, 'flats', 'H', 4],
    [59, 'flats', 'H', 3],
    [24, 'sharps', 'C', 1],
    [108, 'sharps', 'C', 8],
  ] as const)('MIDI %i with %s is %s%i', (midi, style, name, octave) => {
    const spelling = spell(midi, style);
    expect(spelling.name).toBe(name);
    expect(spelling.octave).toBe(octave);
  });

  it('writes German B for B flat but still draws a flat on H', () => {
    const bFlat = spell(70, 'flats');
    expect(bFlat.letterName).toBe('B');
    expect(bFlat.nameAccidental).toBe('natural');
    expect(bFlat.accidental).toBe('flat');
    expect(bFlat.letter).toBe(6);
  });

  it('numbers staff steps diatonically', () => {
    expect(spell(60, 'sharps').diatonicIndex).toBe(28);
    expect(spell(62, 'sharps').diatonicIndex).toBe(29);
    expect(spell(61, 'sharps').diatonicIndex).toBe(28);
    expect(spell(61, 'flats').diatonicIndex).toBe(29);
  });

  it('handles notes below MIDI 0', () => {
    expect(spell(-1, 'sharps')).toEqual(expect.objectContaining({ name: 'H', octave: -2 }));
  });

  it('turns accidentals into symbols', () => {
    expect(accidentalSymbol('sharp')).toBe('♯');
    expect(accidentalSymbol('flat')).toBe('♭');
    expect(accidentalSymbol('natural')).toBe('');
  });
});

describe('readings', () => {
  it('finds the nearest note and the cents from it', () => {
    const reading = readNote(99.13, 442);
    expect(reading.midi).toBe(43);
    expect(reading.cents).toBeCloseTo(12, 0);
    expect(reading.targetFrequency).toBeCloseTo(98.44, 2);
  });

  it('is exactly in tune on the reference pitch', () => {
    expect(readNote(440, 440)).toEqual({
      frequency: 440,
      midi: 69,
      cents: 0,
      targetFrequency: 440,
    });
  });

  it('rounds to the nearer neighbour at ±50 cents', () => {
    const quarterUp = 442 * 2 ** (49 / 1200);
    expect(readNote(quarterUp, 442).midi).toBe(69);
    expect(readNote(442 * 2 ** (51 / 1200), 442)).toEqual(
      expect.objectContaining({ midi: 70, cents: expect.closeTo(-49, 6) }),
    );
  });

  it('follows the reference pitch', () => {
    expect(readNote(442, 440).cents).toBeCloseTo(7.85, 2);
    expect(midiFrequency(69, 442)).toBe(442);
    expect(midiFrequency(81, 440)).toBeCloseTo(880, 9);
    expect(midiFrequency(57, 440)).toBeCloseTo(220, 9);
  });
});
