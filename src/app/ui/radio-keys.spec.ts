import { radioKeyTarget } from './radio-keys';

describe('radioKeyTarget', () => {
  it('moves with the arrows and wraps around', () => {
    expect(radioKeyTarget('ArrowRight', 1, 3)).toBe(2);
    expect(radioKeyTarget('ArrowDown', 2, 3)).toBe(0);
    expect(radioKeyTarget('ArrowLeft', 0, 3)).toBe(2);
    expect(radioKeyTarget('ArrowUp', 2, 3)).toBe(1);
  });

  it('jumps to the ends with Home and End', () => {
    expect(radioKeyTarget('Home', 2, 3)).toBe(0);
    expect(radioKeyTarget('End', 0, 3)).toBe(2);
  });

  it('starts from the first option when none is selected', () => {
    expect(radioKeyTarget('ArrowRight', -1, 3)).toBe(1);
  });

  it('ignores other keys', () => {
    expect(radioKeyTarget('Enter', 0, 3)).toBeNull();
  });
});
