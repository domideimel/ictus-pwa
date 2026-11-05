import { readNote } from '../music/note';
import { PitchDetector } from './pitch-detector';

const SAMPLE_RATE = 48_000;

function sine(
  frequency: number,
  partials: [ratio: number, amplitude: number][] = [[1, 1]],
  count = 4096,
): Float32Array {
  return Float32Array.from({ length: count }, (_, i) => {
    const t = i / SAMPLE_RATE;
    return (
      partials.reduce(
        (sum, [ratio, amplitude]) =>
          sum + amplitude * Math.sin(2 * Math.PI * frequency * ratio * t),
        0,
      ) * 0.4
    );
  });
}

describe('PitchDetector', () => {
  const detector = new PitchDetector(SAMPLE_RATE);

  it('detects A4 at A = 442', () => {
    const reading = readNote(detector.frequency(sine(442))!, 442);
    expect(reading.midi).toBe(69);
    expect(Math.abs(reading.cents)).toBeLessThanOrEqual(1);
  });

  it.each([24, 36, 43, 57, 69, 81, 96, 108])('detects MIDI %i', (midi) => {
    const target = 442 * 2 ** ((midi - 69) / 12);
    const reading = readNote(detector.frequency(sine(target))!, 442);
    expect(reading.midi).toBe(midi);
    expect(Math.abs(reading.cents)).toBeLessThanOrEqual(2);
  });

  it('finds the fundamental of a harmonic tone', () => {
    const tone = sine(98.45, [
      [1, 1],
      [2, 0.6],
      [3, 0.4],
      [4, 0.25],
    ]);
    expect(readNote(detector.frequency(tone)!, 442).midi).toBe(43);
  });

  it('reports the principal tone of a kettle-drum-like sound', () => {
    const tone = sine(110.5, [
      [1, 1],
      [1.5, 0.5],
      [2, 0.4],
      [2.5, 0.2],
    ]);
    expect(readNote(detector.frequency(tone)!, 442).midi).toBe(45);
  });

  it('gives no pitch for silence', () => {
    expect(detector.frequency(new Float32Array(4096))).toBeNull();
  });
});
