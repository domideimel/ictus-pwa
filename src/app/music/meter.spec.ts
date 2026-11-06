import {
  BEAT_RANGE,
  BeatLevel,
  QUICK_PICKS,
  beatLengths,
  canCountInGroups,
  canSwing,
  clamp,
  defaultGrouping,
  defaultLevels,
  durationSymbol,
  durationTitle,
  groupStarts,
  groupingOptions,
  isValidSignature,
  keepNoteValue,
  levelTitle,
  nextLevel,
  sameSignature,
  signatureLabel,
  subdivisionInfo,
  subdivisionOptions,
  tempoMarking,
  tempoUnits,
} from './meter';

describe('time signatures', () => {
  it('labels and compares signatures', () => {
    expect(signatureLabel({ beats: 7, unit: 8 })).toBe('7/8');
    expect(sameSignature({ beats: 3, unit: 4 }, { beats: 3, unit: 4 })).toBe(true);
    expect(sameSignature({ beats: 3, unit: 4 }, { beats: 3, unit: 8 })).toBe(false);
    expect(sameSignature({ beats: 3, unit: 4 }, { beats: 4, unit: 4 })).toBe(false);
  });

  it('accepts 1 to 16 beats over 2, 4, 8 or 16', () => {
    expect(isValidSignature({ beats: BEAT_RANGE.min, unit: 2 })).toBe(true);
    expect(isValidSignature({ beats: BEAT_RANGE.max, unit: 16 })).toBe(true);
    expect(isValidSignature({ beats: 0, unit: 4 })).toBe(false);
    expect(isValidSignature({ beats: 17, unit: 4 })).toBe(false);
    expect(isValidSignature({ beats: 3.5, unit: 4 })).toBe(false);
    expect(isValidSignature({ beats: 4, unit: 3 })).toBe(false);
    expect(isValidSignature({ beats: 4, unit: 32 })).toBe(false);
  });

  it('offers only valid quick picks', () => {
    expect(QUICK_PICKS.every(isValidSignature)).toBe(true);
    expect(QUICK_PICKS.map(signatureLabel)).toContain('4/4');
  });
});

describe('groupings', () => {
  it('splits odd meters into groups of 2 and 3', () => {
    expect(groupingOptions({ beats: 7, unit: 8 })).toEqual([
      [2, 2, 3],
      [2, 3, 2],
      [3, 2, 2],
    ]);
    expect(groupingOptions({ beats: 5, unit: 4 })).toEqual([
      [2, 3],
      [3, 2],
    ]);
  });

  it('lists the fewest groups first and at most six options', () => {
    const options = groupingOptions({ beats: 12, unit: 8 });
    expect(options.length).toBeLessThanOrEqual(6);
    expect(options[0]).toEqual([3, 3, 3, 3]);
    for (const option of options) expect(option.reduce((sum, size) => sum + size, 0)).toBe(12);
    const lengths = options.map((option) => option.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
  });

  it('has no grouping for simple and short meters', () => {
    expect(groupingOptions({ beats: 4, unit: 4 })).toEqual([]);
    expect(groupingOptions({ beats: 6, unit: 4 })).toEqual([]);
    expect(groupingOptions({ beats: 3, unit: 8 })).toEqual([]);
    expect(groupingOptions({ beats: 4, unit: 8 })).toEqual([]);
  });

  it('picks a musical default grouping', () => {
    expect(defaultGrouping({ beats: 4, unit: 4 })).toEqual([4]);
    expect(defaultGrouping({ beats: 6, unit: 8 })).toEqual([3, 3]);
    expect(defaultGrouping({ beats: 9, unit: 8 })).toEqual([3, 3, 3]);
    expect(defaultGrouping({ beats: 12, unit: 8 })).toEqual([3, 3, 3, 3]);
    expect(defaultGrouping({ beats: 5, unit: 4 })).toEqual([3, 2]);
    expect(defaultGrouping({ beats: 5, unit: 8 })).toEqual([3, 2]);
    expect(defaultGrouping({ beats: 7, unit: 8 })).toEqual([2, 2, 3]);
    expect(defaultGrouping({ beats: 11, unit: 8 })).toEqual(
      groupingOptions({ beats: 11, unit: 8 })[0],
    );
  });

  it('marks the beats that start a group', () => {
    expect([...groupStarts([2, 2, 3])]).toEqual([2, 4]);
    expect([...groupStarts([3, 3])]).toEqual([3]);
    expect([...groupStarts([4])]).toEqual([]);
    expect([...groupStarts([])]).toEqual([]);
  });
});

describe('counting', () => {
  it('counts every note, or the groups of a compound or odd meter', () => {
    const elevenEight = { beats: 11, unit: 8 };
    expect(beatLengths(elevenEight, [3, 3, 3, 2], 'unit')).toEqual(Array(11).fill(1));
    expect(beatLengths(elevenEight, [3, 3, 3, 2], 'group')).toEqual([3, 3, 3, 2]);
    // Simple meters have no groups to count.
    expect(canCountInGroups({ beats: 4, unit: 4 }, [4])).toBe(false);
    expect(beatLengths({ beats: 4, unit: 4 }, [4], 'group')).toEqual([1, 1, 1, 1]);
  });

  it('counts the BPM in even groups, in notes when groups are uneven', () => {
    expect(tempoUnits([1, 1, 1])).toBe(1);
    expect(tempoUnits([3, 3])).toBe(3);
    expect(tempoUnits([2, 2, 2])).toBe(2);
    expect(tempoUnits([3, 3, 3, 2])).toBe(1);
    expect(tempoUnits([])).toBe(1);
  });

  it('names durations as single or dotted notes', () => {
    expect(durationSymbol(1, 4)).toBe('♩');
    expect(durationSymbol(1, 8)).toBe('♪');
    expect(durationSymbol(2, 8)).toBe('♩');
    expect(durationSymbol(3, 8)).toBe('♩.');
    expect(durationSymbol(3, 16)).toBe('♪.');
    expect(durationTitle(3, 8)).toBe('dotted quarter');
    expect(durationTitle(2, 16)).toBe('eighth');
    expect(durationTitle(1, 2)).toBe('half');
  });
});

describe('subdivisions', () => {
  const titles = (unit: number, lengths: number[]): string[] =>
    subdivisionOptions(unit, lengths).map((info) => info.title);

  it('describes quarter to sextuplet in 4/4', () => {
    expect(subdivisionOptions(4, [1, 1, 1, 1]).map((info) => info.value)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(titles(4, [1])).toEqual([
      'Quarter',
      'Eighth',
      'Triplet',
      '16th',
      'Quintuplet',
      'Sextuplet',
    ]);
    expect(subdivisionInfo(3, 4, [1])).toEqual(expect.objectContaining({ tuplet: 3 }));
    expect(subdivisionInfo(1, 4, [1]).tuplet).toBeUndefined();
  });

  it('names the notes that actually play in other meters', () => {
    expect(titles(8, Array(11).fill(1)).slice(0, 4)).toEqual(['Eighth', '16th', 'Triplet', '32nd']);
    expect(subdivisionInfo(1, 8, [1]).symbol).toBe('♪');
    expect(subdivisionInfo(2, 8, [1]).symbol).toBe('♬');
    expect(titles(2, [1, 1]).slice(0, 4)).toEqual(['Half', 'Quarter', 'Triplet', 'Eighth']);
  });

  it('offers the groups alone when counting in groups', () => {
    expect(titles(8, [3, 3, 3, 2])).toEqual([
      'Beat',
      'Eighth',
      '16th',
      'Triplet',
      '32nd',
      'Sextuplet',
    ]);
    expect(subdivisionInfo(0, 8, [3, 3, 3, 2]).symbol).toBe('♩.♩');
    expect(subdivisionInfo(0, 8, [3, 3]).symbol).toBe('♩.');
  });

  it('falls back to the plain note for values the meter does not offer', () => {
    expect(subdivisionInfo(9 as never, 4, [1]).value).toBe(1);
    expect(subdivisionInfo(0, 4, [1, 1]).value).toBe(1);
    expect(subdivisionInfo(5, 8, [3, 2]).value).toBe(1);
  });

  it('keeps the note value when the meter changes', () => {
    expect(keepNoteValue(2, 4, 8)).toBe(1); // eighths stay eighths
    expect(keepNoteValue(4, 4, 8)).toBe(2); // sixteenths stay sixteenths
    expect(keepNoteValue(1, 8, 4)).toBe(2); // and back
    expect(keepNoteValue(1, 4, 8)).toBe(1); // quarters don't fit 11/8: plain eighths
    expect(keepNoteValue(1, 8, 8)).toBe(1);
    expect(keepNoteValue(3, 4, 8)).toBe(3);
    expect(keepNoteValue(0, 8, 8)).toBe(1);
  });

  it('swings only pairs of clicks', () => {
    expect([0, 1, 2, 3, 4, 5, 6].filter((value) => canSwing(value as never))).toEqual([2, 4]);
  });
});

describe('beat levels', () => {
  it('cycles accent → normal → mute → accent', () => {
    expect(nextLevel(BeatLevel.Accent)).toBe(BeatLevel.Normal);
    expect(nextLevel(BeatLevel.Normal)).toBe(BeatLevel.Mute);
    expect(nextLevel(BeatLevel.Mute)).toBe(BeatLevel.Accent);
  });

  it('names each level for screen readers', () => {
    expect(levelTitle(BeatLevel.Accent)).toBe('accent');
    expect(levelTitle(BeatLevel.Normal)).toBe('normal');
    expect(levelTitle(BeatLevel.Mute)).toBe('muted');
  });

  it('accents only the first beat by default', () => {
    expect(defaultLevels(4)).toEqual([
      BeatLevel.Accent,
      BeatLevel.Normal,
      BeatLevel.Normal,
      BeatLevel.Normal,
    ]);
    expect(defaultLevels(1)).toEqual([BeatLevel.Accent]);
  });
});

describe('tempo markings', () => {
  it.each([
    [20, 'Grave'],
    [39, 'Grave'],
    [40, 'Largo'],
    [59, 'Largo'],
    [60, 'Larghetto'],
    [66, 'Adagio'],
    [76, 'Andante'],
    [107, 'Andante'],
    [108, 'Moderato'],
    [120, 'Allegro'],
    [167, 'Allegro'],
    [168, 'Presto'],
    [199, 'Presto'],
    [200, 'Prestissimo'],
    [300, 'Prestissimo'],
  ])('%i BPM is %s', (bpm, marking) => {
    expect(tempoMarking(bpm)).toBe(marking);
  });
});

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 1, 10)).toBe(1);
    expect(clamp(11, 1, 10)).toBe(10);
  });
});
