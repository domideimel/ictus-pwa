import { BeatLevel, defaultLevels, groupStarts } from '../music/meter';
import { DEFAULT_GAP_CLICK, DEFAULT_SPEED_TRAINER } from '../music/practice';
import type { ClickParams, ScheduledBeat, ScheduledClick } from './click-scheduler';
import { ClickScheduler } from './click-scheduler';

const base: ClickParams = {
  bpm: 120,
  levels: defaultLevels(4),
  beatLengths: [1, 1, 1, 1],
  tempoUnits: 1,
  groupStarts: groupStarts([4]),
  subdivision: 1,
  swing: 0.5,
  gap: DEFAULT_GAP_CLICK,
  trainer: DEFAULT_SPEED_TRAINER,
  polyrhythm: 'off',
  silent: false,
  accentVolume: 1,
  beatVolume: 0.8,
  subdivisionVolume: 0.5,
  polyVolume: 0.9,
};

/** Runs the scheduler in 25 ms steps, like the ticker worker does. */
function run(
  seconds: number,
  params: Partial<ClickParams> = {},
): { clicks: ScheduledClick[]; beats: ScheduledBeat[] } {
  const scheduler = new ClickScheduler(0);
  const clicks: ScheduledClick[] = [];
  const beats: ScheduledBeat[] = [];
  for (let t = 0.025; t <= seconds + 1e-9; t += 0.025) {
    const result = scheduler.advance(t, {
      ...base,
      // One count per beat level unless a test sets uneven counts.
      beatLengths: (params.levels ?? base.levels).map(() => 1),
      ...params,
    });
    clicks.push(...result.clicks);
    beats.push(...result.beats);
  }
  return { clicks, beats };
}

const times = (clicks: ScheduledClick[], kind?: ScheduledClick['kind']): number[] =>
  clicks.filter((click) => !kind || click.kind === kind).map((click) => click.time);

describe('ClickScheduler', () => {
  it('keeps ten minutes at 120 BPM on the grid', () => {
    const { beats } = run(600);
    expect(beats).toHaveLength(1200);
    beats.forEach((beat, index) => {
      expect(beat.time).toBeCloseTo(index * 0.5, 9);
      expect(beat.bar).toBe(Math.floor(index / 4));
      expect(beat.index).toBe(index % 4);
    });
  });

  it('accents beat 1 and group starts, mutes muted beats', () => {
    const levels = [
      BeatLevel.Accent,
      BeatLevel.Normal,
      BeatLevel.Normal,
      BeatLevel.Normal,
      BeatLevel.Normal,
      BeatLevel.Normal,
      BeatLevel.Mute,
    ];
    const { clicks } = run(3.49, { levels, groupStarts: groupStarts([2, 2, 3]) });
    expect(clicks.map((click) => [click.kind, click.gain])).toEqual([
      ['accent', 1],
      ['beat', 0.8],
      ['accent', 0.6],
      ['beat', 0.8],
      ['accent', 0.6],
      ['beat', 0.8],
    ]);
  });

  it('counts silently for the rest counter', () => {
    const { clicks, beats } = run(2.99, { silent: true });
    expect(clicks).toHaveLength(0);
    expect(beats).toHaveLength(6);
    expect(beats.at(-1)?.bar).toBe(1);
  });

  it('delays the offbeat for triplet swing', () => {
    expect(times(run(0.99, { subdivision: 2, swing: 2 / 3 }).clicks, 'subdivision')).toEqual([
      expect.closeTo(1 / 3, 9),
      expect.closeTo(0.5 + 1 / 3, 9),
    ]);
    expect(times(run(0.99, { subdivision: 2 }).clicks, 'subdivision')).toEqual([0.25, 0.75]);
  });

  it('swings sixteenths long-short within each eighth', () => {
    const subdivisions = times(run(0.49, { subdivision: 4, swing: 2 / 3 }).clicks, 'subdivision');
    // Beat at 0; pairs of sixteenths: long (1/6 of 0.5 s · 2) then short.
    expect(subdivisions).toEqual([
      expect.closeTo(1 / 6, 9),
      expect.closeTo(0.25, 9),
      expect.closeTo(0.25 + 1 / 6, 9),
    ]);
  });

  it('splits the beat in five and six', () => {
    expect(times(run(0.49, { subdivision: 5 }).clicks, 'subdivision')).toEqual(
      [0.1, 0.2, 0.3, 0.4].map((t) => expect.closeTo(t, 9)),
    );
    expect(times(run(0.49, { subdivision: 6 }).clicks, 'subdivision')).toHaveLength(5);
    expect(times(run(0.49, { subdivision: 6 }).clicks, 'subdivision')[0]).toBeCloseTo(0.5 / 6, 9);
  });

  it('spaces 3 against 2 evenly', () => {
    expect(times(run(1.99, { polyrhythm: '3:2' }).clicks, 'poly')).toEqual(
      [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3].map((t) => expect.closeTo(t, 9)),
    );
  });

  it('spaces 4 against 3 across the bar line', () => {
    expect(times(run(2.99, { polyrhythm: '4:3' }).clicks, 'poly')).toEqual(
      [0, 0.375, 0.75, 1.125, 1.5, 1.875, 2.25, 2.625].map((t) => expect.closeTo(t, 9)),
    );
  });

  it('keeps the polyrhythm on the beat when the tempo changes', () => {
    const scheduler = new ClickScheduler(0);
    const poly: number[] = [];
    for (let t = 0.025; t <= 1.5; t += 0.025) {
      const params: ClickParams = { ...base, polyrhythm: '3:2', bpm: t < 0.9 ? 120 : 60 };
      poly.push(...times(scheduler.advance(t, params).clicks, 'poly'));
    }
    // 120 BPM for beats 1-2, then 60 BPM: the next cycle starts exactly on beat 3 at 1 s.
    expect(poly).toEqual([0, 1 / 3, 2 / 3, 1, 1 + 2 / 3].map((t) => expect.closeTo(t, 9)));
  });

  it('plays the polyrhythm through muted beats but not in a gap bar', () => {
    const levels = [BeatLevel.Accent, BeatLevel.Mute, BeatLevel.Normal, BeatLevel.Normal];
    expect(times(run(0.99, { polyrhythm: '3:2', levels }).clicks, 'poly')).toHaveLength(3);
    const gap = { enabled: true, play: 1, mute: 1 };
    const poly = times(run(3.99, { polyrhythm: '3:2', gap }).clicks, 'poly');
    expect(poly.every((t) => t < 2)).toBe(true);
  });

  it('silences every second bar of a 1 + 1 gap click', () => {
    const { clicks } = run(5.99, { gap: { enabled: true, play: 1, mute: 1 } });
    expect(times(clicks)).toEqual([0, 0.5, 1, 1.5, 4, 4.5, 5, 5.5]);
  });

  it('raises the tempo on the bar line', () => {
    const { beats } = run(8, {
      bpm: 100,
      trainer: { enabled: true, step: 10, everyBars: 1, target: 120 },
    });
    expect(beats[4]!.time).toBeCloseTo(4 * 0.6, 9);
    expect(beats[8]!.time).toBeCloseTo(4 * 0.6 + (4 * 60) / 110, 9);
    expect(beats[9]!.time - beats[8]!.time).toBeCloseTo(0.5, 9);
  });
  it('places subdivision clicks between the beats at their own volume', () => {
    const { clicks } = run(0.49, { subdivision: 3 });
    expect(clicks.map((click) => [click.kind, click.gain])).toEqual([
      ['accent', 1],
      ['subdivision', 0.5],
      ['subdivision', 0.5],
    ]);
    expect(times(clicks, 'subdivision')).toEqual([1 / 6, 2 / 6].map((t) => expect.closeTo(t, 9)));
  });

  it('mutes the subdivisions of a muted beat', () => {
    const levels = [BeatLevel.Accent, BeatLevel.Mute, BeatLevel.Normal, BeatLevel.Normal];
    const { clicks, beats } = run(0.99, { subdivision: 2, levels });
    expect(times(clicks)).toEqual([0, 0.25]);
    expect(beats.map((beat) => beat.index)).toEqual([0, 1]);
  });

  it('ignores swing for subdivisions that cannot swing', () => {
    expect(times(run(0.49, { subdivision: 3, swing: 0.75 }).clicks, 'subdivision')).toEqual(
      [1 / 6, 2 / 6].map((t) => expect.closeTo(t, 9)),
    );
  });

  it('picks up a new tempo on the next click', () => {
    const scheduler = new ClickScheduler(0);
    const first = scheduler.advance(0.6, base).beats.map((beat) => beat.time);
    const second = scheduler.advance(2.1, { ...base, bpm: 60 }).beats.map((beat) => beat.time);
    expect(first).toEqual([0, 0.5]);
    expect(second).toEqual([1, 2]);
  });

  it('wraps to a shorter bar when the meter changes mid-bar', () => {
    const scheduler = new ClickScheduler(0);
    scheduler.advance(1.4, base);
    // Beats 1-3 of a 4/4 bar have played; with two beats per bar, beat 4 becomes a new bar.
    const { beats } = scheduler.advance(2.6, {
      ...base,
      levels: defaultLevels(2),
      beatLengths: [1, 1],
    });
    expect(beats.map((beat) => [beat.time, beat.index, beat.bar])).toEqual([
      [1.5, 0, 1],
      [2, 1, 1],
      [2.5, 0, 2],
    ]);
  });

  it('plays every eighth of 11/8 with group accents', () => {
    // ♪ = 120: 11 clicks half a second apart, then the next bar.
    const { clicks, beats } = run(5.99, {
      levels: defaultLevels(11),
      groupStarts: groupStarts([3, 3, 3, 2]),
    });
    expect(beats).toHaveLength(12);
    expect(beats.at(-1)).toEqual({ time: 5.5, index: 0, bar: 1 });
    expect(clicks.filter((click) => click.kind === 'accent').map((click) => click.time)).toEqual([
      0, 1.5, 3, 4.5, 5.5,
    ]);
  });

  it('counts 11/8 in uneven groups of 3+3+3+2 eighths', () => {
    const groups = { beatLengths: [3, 3, 3, 2], levels: defaultLevels(4) };
    // Groups only: long, long, long, short at ♪ = 120.
    const counts = run(5.99, { ...groups, subdivision: 0 });
    expect(times(counts.clicks)).toEqual([0, 1.5, 3, 4.5, 5.5]);
    expect(counts.beats.map((beat) => beat.index)).toEqual([0, 1, 2, 3, 0]);
    // Eighths: three clicks in each long count and two in the short one, 11 per bar.
    const eighths = run(5.49, { ...groups, subdivision: 1 });
    expect(times(eighths.clicks)).toEqual(Array.from({ length: 11 }, (_, i) => i * 0.5));
    expect(times(eighths.clicks, 'subdivision')).toHaveLength(7);
    // Sixteenths: 22 per bar.
    expect(run(5.49, { ...groups, subdivision: 2 }).clicks).toHaveLength(22);
  });

  it('counts the BPM in groups when they are even', () => {
    // 6/8 in two at ♩. = 60: a beat per second, three eighths in each.
    const { clicks, beats } = run(1.99, {
      bpm: 60,
      beatLengths: [3, 3],
      tempoUnits: 3,
      levels: defaultLevels(2),
      subdivision: 1,
    });
    expect(beats.map((beat) => beat.time)).toEqual([0, 1]);
    expect(times(clicks)).toEqual(
      [0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3].map((t) => expect.closeTo(t, 9)),
    );
  });

  it('swings sixteenth pairs inside a beat of three eighths', () => {
    const { clicks } = run(0.99, {
      beatLengths: [3, 2],
      levels: defaultLevels(2),
      subdivision: 2,
      swing: 2 / 3,
    });
    // ♪ = 120: each eighth is 0.5 s, split 1/3 s long and 1/6 s short.
    expect(times(clicks).slice(0, 4)).toEqual(
      [0, 1 / 3, 0.5, 0.5 + 1 / 3].map((t) => expect.closeTo(t, 9)),
    );
  });

  it('starts at the given time and schedules nothing before it', () => {
    const scheduler = new ClickScheduler(10);
    expect(scheduler.advance(9.9, base).clicks).toEqual([]);
    expect(times(scheduler.advance(10.6, base).clicks)).toEqual([10, 10.5]);
  });

  it('keeps counting silently with the polyrhythm on', () => {
    const { clicks, beats } = run(1.99, { polyrhythm: '3:2', silent: true });
    expect(clicks).toEqual([]);
    expect(beats).toHaveLength(4);
  });

  it('plays 5 against 4 at the polyrhythm volume', () => {
    const poly = run(1.99, { polyrhythm: '5:4', polyVolume: 0.3 }).clicks.filter(
      (click) => click.kind === 'poly',
    );
    expect(poly.map((click) => click.time)).toEqual(
      [0, 0.4, 0.8, 1.2, 1.6].map((t) => expect.closeTo(t, 9)),
    );
    expect(poly.every((click) => click.gain === 0.3)).toBe(true);
  });

  it('stops the polyrhythm on the next beat when it is switched off', () => {
    const scheduler = new ClickScheduler(0);
    const on = times(scheduler.advance(0.1, { ...base, polyrhythm: '3:2' }).clicks, 'poly');
    const off = times(scheduler.advance(2, base).clicks, 'poly');
    expect(on).toEqual([0, expect.closeTo(1 / 3, 9)]);
    expect(off).toEqual([]);
  });
});
