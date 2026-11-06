import { BeatLevel, defaultLevels, groupStarts } from '../music/meter';
import { DEFAULT_GAP_CLICK, DEFAULT_SPEED_TRAINER } from '../music/practice';
import { ClickParams, ClickScheduler, ScheduledBeat, ScheduledClick } from './click-scheduler';

const base: ClickParams = {
  bpm: 120,
  levels: defaultLevels(4),
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
    const result = scheduler.advance(t, { ...base, ...params });
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
    expect(beats[4].time).toBeCloseTo(4 * 0.6, 9);
    expect(beats[8].time).toBeCloseTo(4 * 0.6 + (4 * 60) / 110, 9);
    expect(beats[9].time - beats[8].time).toBeCloseTo(0.5, 9);
  });
});
