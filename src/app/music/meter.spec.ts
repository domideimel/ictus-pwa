import {
  BEAT_RANGE,
  BeatLevel,
  QUICK_PICKS,
  SUBDIVISIONS,
  canSwing,
  clamp,
  defaultGrouping,
  defaultLevels,
  groupStarts,
  groupingOptions,
  isValidSignature,
  levelTitle,
  nextLevel,
  sameSignature,
  signatureLabel,
  subdivisionInfo,
  tempoMarking,
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

describe('subdivisions', () => {
  it('describes quarter to sextuplet', () => {
    expect(SUBDIVISIONS.map((info) => info.value)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(subdivisionInfo(3)).toEqual(expect.objectContaining({ title: 'Triplet', tuplet: 3 }));
    expect(subdivisionInfo(1).tuplet).toBeUndefined();
  });

  it('falls back to quarters for unknown values', () => {
    expect(subdivisionInfo(9 as never).value).toBe(1);
  });

  it('swings only eighths and sixteenths', () => {
    expect([1, 2, 3, 4, 5, 6].filter((value) => canSwing(value as never))).toEqual([2, 4]);
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
