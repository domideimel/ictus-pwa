import {
  DEFAULT_GAP_CLICK,
  DEFAULT_SPEED_TRAINER,
  POLYRHYTHMS,
  gapSummary,
  isGapBar,
  polyrhythmCycle,
  trainerSummary,
  trainerTempo,
} from './practice';

describe('gap click', () => {
  const gap = { enabled: true, play: 2, mute: 1 };

  it('plays the first bars of each cycle and mutes the rest', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((bar) => isGapBar(gap, bar))).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
      false,
    ]);
  });

  it('never mutes when switched off or misconfigured', () => {
    expect(isGapBar({ ...gap, enabled: false }, 2)).toBe(false);
    expect(isGapBar({ ...gap, play: 0 }, 2)).toBe(false);
    expect(isGapBar({ ...gap, mute: 0 }, 2)).toBe(false);
    expect(isGapBar(DEFAULT_GAP_CLICK, 3)).toBe(false);
  });

  it('summarises the setting', () => {
    expect(gapSummary(gap)).toBe('Gap 2 on · 1 off');
  });
});

describe('speed trainer', () => {
  const trainer = { enabled: true, step: 5, everyBars: 4, target: 120 };

  it('raises the tempo every few bars up to the target', () => {
    expect(trainerTempo(100, 0, trainer)).toBe(100);
    expect(trainerTempo(100, 3, trainer)).toBe(100);
    expect(trainerTempo(100, 4, trainer)).toBe(105);
    expect(trainerTempo(100, 15, trainer)).toBe(115);
    expect(trainerTempo(100, 16, trainer)).toBe(120);
    expect(trainerTempo(100, 400, trainer)).toBe(120);
  });

  it('keeps the base tempo when off, misconfigured or already at the target', () => {
    expect(trainerTempo(100, 8, DEFAULT_SPEED_TRAINER)).toBe(100);
    expect(trainerTempo(100, 8, { ...trainer, step: 0 })).toBe(100);
    expect(trainerTempo(100, 8, { ...trainer, everyBars: 0 })).toBe(100);
    expect(trainerTempo(130, 8, trainer)).toBe(130);
    expect(trainerTempo(120, 8, trainer)).toBe(120);
  });

  it('summarises the setting', () => {
    expect(trainerSummary(trainer)).toBe('+5 every 4 bars → 120');
  });
});

describe('polyrhythms', () => {
  it('reads N clicks across N - 1 beats', () => {
    expect(polyrhythmCycle('off')).toBeNull();
    expect(polyrhythmCycle('3:2')).toEqual({ clicks: 3, beats: 2 });
    expect(polyrhythmCycle('4:3')).toEqual({ clicks: 4, beats: 3 });
    expect(polyrhythmCycle('5:4')).toEqual({ clicks: 5, beats: 4 });
  });

  it('offers off and every supported ratio', () => {
    expect(POLYRHYTHMS).toEqual(['off', '3:2', '4:3', '5:4']);
    for (const poly of POLYRHYTHMS.slice(1)) {
      const [clicks, beats] = poly.split(':').map(Number);
      expect(polyrhythmCycle(poly)).toEqual({ clicks, beats });
    }
  });
});
