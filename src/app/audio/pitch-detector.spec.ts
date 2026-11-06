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

describe('PitchDetector limits', () => {
  it('needs at least 256 samples', () => {
    expect(new PitchDetector(SAMPLE_RATE).frequency(sine(440, [[1, 1]], 255))).toBeNull();
  });

  it('treats very quiet input as silence', () => {
    const quiet = sine(440).map((value) => value * 0.001);
    expect(new PitchDetector(SAMPLE_RATE).frequency(quiet)).toBeNull();
  });

  it('gives no pitch for noise', () => {
    let seed = 1;
    const noise = Float32Array.from({ length: 4096 }, () => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647) * 2 - 1;
    });
    expect(new PitchDetector(SAMPLE_RATE).frequency(noise)).toBeNull();
  });

  it('works at 44.1 kHz too', () => {
    const detector = new PitchDetector(44_100);
    const samples = Float32Array.from(
      { length: 4096 },
      (_, i) => 0.4 * Math.sin((2 * Math.PI * 220 * i) / 44_100),
    );
    expect(detector.frequency(samples)).toBeCloseTo(220, 0);
  });
});
