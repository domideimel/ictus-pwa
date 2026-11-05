import { DestroyRef, Service, computed, effect, inject, signal } from '@angular/core';
import { setAudioSession } from '../audio/audio-context';
import { Microphone } from '../audio/microphone';
import { readNote } from '../music/note';
import { MetronomeStore } from './metronome.store';
import { PageVisibility } from './page-visibility';
import { SettingsStore } from './settings.store';

/** The last note stays on screen this long after the sound decays (drums die away fast). */
const HOLD_MS = 1500;

/** Median of the last few readings for a steady display; a jump of more than 60 cents starts a new note. */
export class PitchSmoother {
  private history: number[] = [];
  private silentFrames = 0;
  private lastHeard = -Infinity;

  frequency: number | null = null;
  /** Increments once per new, stable note (a drum strike). */
  strikeCount = 0;
  /** Pitch of the latest strike. */
  strikeFrequency: number | null = null;

  ingest(detected: number | null, now: number): void {
    if (detected === null) {
      // A short silence ends the note, so the next one counts as a new strike.
      this.silentFrames += 1;
      if (this.silentFrames >= 2) this.history = [];
      if (this.frequency !== null && now - this.lastHeard > HOLD_MS) this.frequency = null;
      return;
    }
    this.silentFrames = 0;
    const previous = median(this.history);
    if (previous !== null && Math.abs(1200 * Math.log2(detected / previous)) > 60)
      this.history = [];
    this.history = [...this.history, detected].slice(-5);
    const current = median(this.history);
    if (this.history.length < 2 || current === null) return;
    this.frequency = current;
    this.lastHeard = now;
    if (this.history.length === 3) {
      this.strikeFrequency = current;
      this.strikeCount += 1;
    }
  }

  reset(): void {
    this.history = [];
    this.frequency = null;
  }
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/**
 * The tuner listens only after Start is pressed, while it is on screen and the page is visible.
 * The click would drown the microphone, so a playing metronome pauses it.
 */
@Service()
export class TunerStore {
  private readonly settings = inject(SettingsStore);
  private readonly metronome = inject(MetronomeStore);
  private readonly visibility = inject(PageVisibility);

  /** Set by the shell: the tuner tab is open, or the combined tablet/desktop layout is showing. */
  readonly onScreen = signal(false);
  private readonly switchedOnState = signal(false);
  readonly switchedOn = this.switchedOnState.asReadonly();

  private readonly listening = signal(false);
  private readonly denied = signal(false);
  private readonly frequencyState = signal<number | null>(null);
  private readonly strike = signal<{ count: number; frequency: number | null }>({
    count: 0,
    frequency: null,
  });

  readonly isListening = this.listening.asReadonly();
  readonly microphoneDenied = this.denied.asReadonly();
  readonly frequency = this.frequencyState.asReadonly();
  readonly strikeCount = computed(() => this.strike().count);
  readonly strikeFrequency = computed(() => this.strike().frequency);

  readonly isPausedForClick = computed(
    () => this.onScreen() && this.switchedOn() && this.metronome.isPlaying(),
  );

  readonly reading = computed(() => {
    const frequency = this.frequencyState();
    return frequency === null ? null : readNote(frequency, this.settings.referencePitch());
  });

  readonly isInTune = computed(() => {
    const reading = this.reading();
    return reading !== null && Math.abs(reading.cents) <= this.settings.tolerance();
  });

  private readonly smoother = new PitchSmoother();
  private readonly microphone = new Microphone((frequency) => this.ingest(frequency));
  private wanted = false;

  constructor() {
    effect(() => {
      const wanted =
        this.onScreen() &&
        this.switchedOn() &&
        this.visibility.visible() &&
        !this.metronome.isPlaying();
      if (wanted) void this.listen();
      else this.silence();
    });
    // Leaving the tuner switches it off, so the microphone is only used after pressing Start.
    effect(() => {
      if (!this.onScreen()) this.switchedOnState.set(false);
    });
    inject(DestroyRef).onDestroy(() => this.microphone.dispose());
  }

  /** Start / stop button. Starting stops the click, which would drown the microphone. */
  toggle(): void {
    if (!this.switchedOn()) this.metronome.stop();
    this.switchedOnState.update((on) => !on);
  }

  private async listen(): Promise<void> {
    this.wanted = true;
    if (this.listening()) return;
    try {
      setAudioSession('play-and-record');
      await this.microphone.start();
      this.denied.set(false);
      if (!this.wanted) {
        this.microphone.stop();
        return;
      }
      this.listening.set(true);
    } catch (error) {
      console.warn('Tuner start failed', error);
      this.denied.set(error instanceof DOMException && error.name === 'NotAllowedError');
      this.switchedOnState.set(false);
      setAudioSession('playback');
    }
  }

  private silence(): void {
    this.wanted = false;
    if (!this.listening()) return;
    this.microphone.stop();
    this.listening.set(false);
    this.smoother.reset();
    this.frequencyState.set(null);
    setAudioSession('playback');
  }

  private ingest(detected: number | null): void {
    if (!this.listening()) return;
    const before = this.smoother.strikeCount;
    this.smoother.ingest(detected, performance.now());
    this.frequencyState.set(this.smoother.frequency);
    if (this.smoother.strikeCount !== before) {
      this.strike.set({
        count: this.smoother.strikeCount,
        frequency: this.smoother.strikeFrequency,
      });
    }
  }
}
