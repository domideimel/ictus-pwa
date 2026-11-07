import { clamp, wholeIn } from './numbers';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 1, 10)).toBe(1);
    expect(clamp(11, 1, 10)).toBe(10);
  });
});

describe('wholeIn', () => {
  it('rounds to a whole number inside the range', () => {
    expect(wholeIn(4.6, { min: 1, max: 10 })).toBe(5);
    expect(wholeIn(0.2, { min: 1, max: 10 })).toBe(1);
    expect(wholeIn(99, { min: 1, max: 10 })).toBe(10);
  });
});
