import type { ClickKind } from './click-synth';
import { CLICK_SOUNDS, synthesizeClick } from './click-synth';

const KINDS: ClickKind[] = ['accent', 'beat', 'subdivision', 'poly'];

/** Zero crossings per second ≈ twice the dominant frequency. */
function crossingsPerSecond(samples: Float32Array, sampleRate: number, seconds = 0.004): number {
  const count = Math.floor(seconds * sampleRate);
  let crossings = 0;
  for (let i = 1; i < count; i++) if (samples[i - 1]! < 0 !== samples[i]! < 0) crossings++;
  return crossings / seconds;
}

describe('synthesizeClick', () => {
  it.each(CLICK_SOUNDS.map((sound) => sound.value))('normalises %s to a 0.9 peak', (sound) => {
    for (const kind of KINDS) {
      const samples = synthesizeClick(sound, kind, 48_000);
      const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
      expect(peak).toBeCloseTo(0.9, 6);
      expect(samples.every(Number.isFinite)).toBe(true);
    }
  });

  it('lasts as long as each sound decays', () => {
    expect(synthesizeClick('click', 'beat', 48_000)).toHaveLength(1920);
    expect(synthesizeClick('woodblock', 'beat', 48_000)).toHaveLength(4320);
    expect(synthesizeClick('cowbell', 'beat', 44_100)).toHaveLength(13_230);
  });

  it('starts silently so the click never pops', () => {
    for (const { value } of CLICK_SOUNDS)
      expect(Math.abs(synthesizeClick(value, 'accent', 48_000)[0]!)).toBe(0);
  });

  it('pitches accents above beats, subdivisions below and the polyrhythm highest', () => {
    const pitch = (kind: ClickKind): number =>
      crossingsPerSecond(synthesizeClick('woodblock', kind, 48_000), 48_000);
    expect(pitch('accent')).toBeGreaterThan(pitch('beat'));
    expect(pitch('beat')).toBeGreaterThan(pitch('subdivision'));
    expect(pitch('poly')).toBeGreaterThan(pitch('accent'));
  });

  it('is deterministic', () => {
    expect(synthesizeClick('click', 'beat', 48_000)).toEqual(
      synthesizeClick('click', 'beat', 48_000),
    );
  });
});
