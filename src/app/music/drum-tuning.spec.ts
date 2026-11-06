import {
  LUG_RANGE,
  deviations,
  emptyTuning,
  recordStrike,
  referencePitch,
  spread,
} from './drum-tuning';

const cents = (base: number, offset: number): number => base * 2 ** (offset / 1200);

describe('drum tuning', () => {
  it('starts with no readings at lug 1', () => {
    expect(emptyTuning(6)).toEqual({ readings: Array(6).fill(null), currentLug: 0, target: null });
    expect(emptyTuning(6, 220).target).toBe(220);
  });

  it('keeps the lug count within 3 to 16', () => {
    expect(emptyTuning(1).readings).toHaveLength(LUG_RANGE.min);
    expect(emptyTuning(40).readings).toHaveLength(LUG_RANGE.max);
    expect(emptyTuning(7.6).readings).toHaveLength(8);
  });

  it('records strikes clockwise and wraps to lug 1', () => {
    let tuning = emptyTuning(3);
    tuning = recordStrike(tuning, 200);
    tuning = recordStrike(tuning, 201);
    expect(tuning.readings).toEqual([200, 201, null]);
    expect(tuning.currentLug).toBe(2);
    tuning = recordStrike(tuning, 202);
    expect(tuning.currentLug).toBe(0);
    tuning = recordStrike(tuning, 199);
    expect(tuning.readings).toEqual([199, 201, 202]);
  });

  it('compares lugs with their average in cents', () => {
    let tuning = emptyTuning(4);
    for (const frequency of [200, 200, 200, cents(200, 20)])
      tuning = recordStrike(tuning, frequency);
    const values = deviations(tuning) as number[];
    expect(values[3] - values[0]).toBeCloseTo(20, 6);
    expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0, 6);
    expect(spread(tuning)).toBeCloseTo(20, 6);
  });

  it('averages on a logarithmic scale', () => {
    let tuning = emptyTuning(3);
    tuning = recordStrike(tuning, 100);
    tuning = recordStrike(tuning, 400);
    expect(referencePitch(tuning)).toBeCloseTo(200, 9);
  });

  it('compares with a target when one is set', () => {
    let tuning = { ...emptyTuning(6, 220), currentLug: 2 };
    tuning = recordStrike(tuning, cents(220, -10));
    expect(referencePitch(tuning)).toBe(220);
    expect(deviations(tuning)[2]).toBeCloseTo(-10, 6);
    expect(deviations(tuning)[0]).toBeNull();
  });

  it('has no reference or spread until enough lugs are measured', () => {
    const empty = emptyTuning(4);
    expect(referencePitch(empty)).toBeNull();
    expect(deviations(empty)).toEqual([null, null, null, null]);
    expect(spread(empty)).toBeNull();
    expect(spread(recordStrike(empty, 200))).toBeNull();
  });
});
