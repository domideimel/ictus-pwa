/** Message the microphone posts to the pitch worker once per hop. */
export interface PitchRequest {
  readonly sampleRate: number;
  readonly samples: Float32Array;
}

/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002). Pure computation, no DOM access,
 * so it runs inside the pitch web worker. Not thread-safe: one instance per worker.
 */
export class PitchDetector {
  minimumFrequency = 30;
  maximumFrequency = 4500;
  /** YIN absolute threshold on the cumulative mean normalized difference. */
  threshold = 0.15;
  /** Below this RMS the input counts as silence. */
  silenceRms = 0.002;

  private difference = new Float64Array(0);
  private normalized = new Float64Array(0);

  constructor(readonly sampleRate: number) {}

  /**
   * Returns the fundamental frequency in Hz, or null for silence or unpitched input.
   * Half of the buffer is the integration window, so the buffer must be at least two periods long.
   */
  frequency(samples: Float32Array): number | null {
    const count = samples.length;
    if (count < 256) return null;

    let squares = 0;
    for (const value of samples) squares += value * value;
    if (Math.sqrt(squares / count) < this.silenceRms) return null;

    const window = count >> 1;
    const tauMax = Math.min(
      count - window,
      Math.floor(this.sampleRate / this.minimumFrequency) + 2,
    );
    const tauMin = Math.max(2, Math.floor(this.sampleRate / this.maximumFrequency));
    if (tauMax <= tauMin + 2) return null;

    if (this.difference.length < tauMax) {
      this.difference = new Float64Array(tauMax);
      this.normalized = new Float64Array(tauMax);
    }
    const difference = this.difference;
    const normalized = this.normalized;

    // d(tau) = sum over the window of (x[j] - x[j + tau])^2, then the cumulative mean normalized d'(tau).
    normalized[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < tauMax; tau++) {
      let d = 0;
      for (let j = 0; j < window; j++) {
        const delta = (samples[j] ?? 0) - (samples[j + tau] ?? 0);
        d += delta * delta;
      }
      difference[tau] = d;
      runningSum += d;
      normalized[tau] = runningSum > 0 ? (d * tau) / runningSum : 1;
    }

    let tau = this.bestPeriod(tauMin, tauMax);
    if (tau === null) return null;
    tau = this.correctMissingFundamental(tau, tauMin, tauMax, samples);
    return this.sampleRate / this.refined(tau, tauMax);
  }

  /** First dip under the threshold (walked down to its local minimum), else the global minimum if it is clear enough. */
  private bestPeriod(tauMin: number, tauMax: number): number | null {
    const normalized = this.normalized;
    for (let tau = tauMin; tau < tauMax - 1; tau++) {
      if ((normalized[tau] ?? 1) < this.threshold) {
        while (tau + 1 < tauMax - 1 && (normalized[tau + 1] ?? 1) < (normalized[tau] ?? 1)) tau++;
        return tau;
      }
    }
    let best = tauMin;
    for (let candidate = tauMin; candidate < tauMax - 1; candidate++) {
      if ((normalized[candidate] ?? 1) < (normalized[best] ?? 1)) best = candidate;
    }
    return (normalized[best] ?? 1) < 0.35 ? best : null;
  }

  /**
   * Kettle drums have a strong principal tone with partials near 1.5x and 2x and almost nothing below.
   * Their common period is twice the principal's, so YIN lands an octave low. If the detected
   * fundamental carries almost no energy while 2f and 3f do, report 2f (the principal tone) instead.
   */
  private correctMissingFundamental(
    tau: number,
    tauMin: number,
    tauMax: number,
    samples: Float32Array,
  ): number {
    const half = tau >> 1;
    if (half - 2 < tauMin) return tau;
    const f = this.sampleRate / tau;
    const fundamental = this.magnitude(f, samples);
    const second = this.magnitude(2 * f, samples);
    const third = this.magnitude(3 * f, samples);
    if (!(second > 0 && fundamental < 0.15 * second && third > 0.2 * second)) return tau;

    let best = half;
    for (let candidate = half - 2; candidate <= Math.min(half + 2, tauMax - 2); candidate++) {
      if ((this.normalized[candidate] ?? 1) < (this.normalized[best] ?? 1)) best = candidate;
    }
    return best;
  }

  /** Goertzel magnitude of one frequency over the buffer. */
  private magnitude(frequency: number, samples: Float32Array): number {
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / this.sampleRate);
    let s1 = 0;
    let s2 = 0;
    for (const sample of samples) {
      const s0 = sample + coefficient * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const power = s1 * s1 + s2 * s2 - coefficient * s1 * s2;
    return Math.sqrt(Math.max(0, power)) / samples.length;
  }

  /** Parabolic interpolation on the raw difference function for sub-sample precision. */
  private refined(tau: number, tauMax: number): number {
    if (tau <= 1 || tau >= tauMax - 1) return tau;
    const s0 = this.difference[tau - 1] ?? 0;
    const s1 = this.difference[tau] ?? 0;
    const s2 = this.difference[tau + 1] ?? 0;
    const denominator = s0 + s2 - 2 * s1;
    if (Math.abs(denominator) <= Number.EPSILON) return tau;
    return tau + (s0 - s2) / (2 * denominator);
  }
}
