import { DestroyRef, computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
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

interface TunerState {
  /** Set by the shell: the tuner tab is open, or the combined tablet/desktop layout is showing. */
  readonly onScreen: boolean;
  readonly switchedOn: boolean;
  readonly isListening: boolean;
  readonly microphoneDenied: boolean;
  readonly frequency: number | null;
  readonly strike: { readonly count: number; readonly frequency: number | null };
}

/**
 * The tuner listens only after Start is pressed, while it is on screen and the page is visible.
 * The click would drown the microphone, so a playing metronome pauses it.
 */
export const TunerStore = signalStore(
  { providedIn: 'root' },
  withState<TunerState>({
    onScreen: false,
    switchedOn: false,
    isListening: false,
    microphoneDenied: false,
    frequency: null,
    strike: { count: 0, frequency: null },
  }),
  withProps(() => ({
    _settings: inject(SettingsStore),
    _metronome: inject(MetronomeStore),
    _visibility: inject(PageVisibility),
  })),
  withComputed(({ onScreen, switchedOn, frequency, strike, _settings, _metronome }) => {
    const reading = computed(() => {
      const value = frequency();
      return value === null ? null : readNote(value, _settings.referencePitch());
    });
    return {
      strikeCount: computed(() => strike().count),
      strikeFrequency: computed(() => strike().frequency),
      isPausedForClick: computed(() => onScreen() && switchedOn() && _metronome.isPlaying()),
      reading,
      isInTune: computed(() => {
        const value = reading();
        return value !== null && Math.abs(value.cents) <= _settings.tolerance();
      }),
    };
  }),
  withMethods((store) => {
    const smoother = new PitchSmoother();
    let wanted = false;

    const ingest = (detected: number | null): void => {
      if (!store.isListening()) return;
      const before = smoother.strikeCount;
      smoother.ingest(detected, performance.now());
      patchState(store, { frequency: smoother.frequency });
      if (smoother.strikeCount !== before) {
        patchState(store, {
          strike: { count: smoother.strikeCount, frequency: smoother.strikeFrequency },
        });
      }
    };
    const microphone = new Microphone(ingest);
    inject(DestroyRef).onDestroy(() => microphone.dispose());

    return {
      setOnScreen(onScreen: boolean): void {
        // Leaving the tuner switches it off, so the microphone is only used after pressing Start.
        patchState(store, onScreen ? { onScreen } : { onScreen, switchedOn: false });
      },

      /** Start / stop button. Starting stops the click, which would drown the microphone. */
      toggle(): void {
        if (!store.switchedOn()) store._metronome.stop();
        patchState(store, ({ switchedOn }) => ({ switchedOn: !switchedOn }));
      },

      async _listen(): Promise<void> {
        wanted = true;
        if (store.isListening()) return;
        try {
          setAudioSession('play-and-record');
          await microphone.start();
          patchState(store, { microphoneDenied: false });
          if (!wanted) {
            microphone.stop();
            return;
          }
          patchState(store, { isListening: true });
        } catch (error) {
          console.warn('Tuner start failed', error);
          patchState(store, {
            microphoneDenied: error instanceof DOMException && error.name === 'NotAllowedError',
            switchedOn: false,
          });
          setAudioSession('playback');
        }
      },

      _silence(): void {
        wanted = false;
        if (!store.isListening()) return;
        microphone.stop();
        smoother.reset();
        patchState(store, { isListening: false, frequency: null });
        setAudioSession('playback');
      },
    };
  }),
  withHooks({
    onInit(store) {
      effect(() => {
        const wanted =
          store.onScreen() &&
          store.switchedOn() &&
          store._visibility.visible() &&
          !store._metronome.isPlaying();
        if (wanted) void store._listen();
        else store._silence();
      });
    },
  }),
);
