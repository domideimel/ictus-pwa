export type ClickSound = 'click' | 'woodblock' | 'cowbell';
/** `poly` is the polyrhythm voice: an octave above the beat so it stands apart. */
export type ClickKind = 'accent' | 'beat' | 'subdivision' | 'poly';

export const CLICK_SOUNDS: readonly { value: ClickSound; title: string }[] = [
  { value: 'click', title: 'Click' },
  { value: 'woodblock', title: 'Woodblock' },
  { value: 'cowbell', title: 'Cowbell' },
];

const PITCH: Record<ClickKind, number> = { accent: 1.5, beat: 1, subdivision: 0.85, poly: 2 };
const DURATION: Record<ClickSound, number> = { click: 0.04, woodblock: 0.09, cowbell: 0.3 };

/** Short percussive sounds built from decaying sines. Accents sound higher, subdivisions lower. */
export function synthesizeClick(
  sound: ClickSound,
  kind: ClickKind,
  sampleRate: number,
): Float32Array<ArrayBuffer> {
  const pitch = PITCH[kind];
  const count = Math.floor(DURATION[sound] * sampleRate);
  const output = new Float32Array(count);
  let noise = 0x12345678;
  const nextNoise = (): number => {
    noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
    return (noise / 0xffffffff) * 2 - 1;
  };

  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    let value: number;
    switch (sound) {
      case 'click': {
        const f = 2000 * pitch;
        value =
          Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.006) * 0.8 +
          nextNoise() * Math.exp(-t / 0.0015) * 0.4;
        break;
      }
      case 'woodblock': {
        const f = 900 * pitch;
        value =
          Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.018) * 0.85 +
          Math.sin(2 * Math.PI * f * 2.73 * t) * Math.exp(-t / 0.006) * 0.25;
        break;
      }
      case 'cowbell': {
        const f1 = 562 * pitch;
        const f2 = 845 * pitch;
        let partials = 0;
        for (const harmonic of [1, 3, 5]) {
          partials +=
            (Math.sin(2 * Math.PI * f1 * harmonic * t) +
              Math.sin(2 * Math.PI * f2 * harmonic * t)) /
            harmonic;
        }
        value = Math.tanh(partials * 0.8) * Math.exp(-t / 0.07);
        break;
      }
    }
    output[i] = value * Math.min(1, t / 0.0005);
  }

  let peak = 0;
  for (const value of output) peak = Math.max(peak, Math.abs(value));
  if (peak > 0) {
    const gain = 0.9 / peak;
    for (let i = 0; i < count; i++) output[i] *= gain;
  }
  return output;
}
