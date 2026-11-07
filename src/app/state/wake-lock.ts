import { Service, computed, effect, inject } from '@angular/core';
import { MetronomeStore } from './metronome.store';
import { PageVisibility } from './page-visibility';
import { SettingsStore } from './settings.store';
import { TunerStore } from './tuner.store';

/** Keeps the screen on while the click plays or the tuner listens ("Keep screen awake" setting). */
@Service()
export class WakeLock {
  private readonly settings = inject(SettingsStore);
  private readonly metronome = inject(MetronomeStore);
  private readonly tuner = inject(TunerStore);
  private readonly visibility = inject(PageVisibility);

  private sentinel: WakeLockSentinel | null = null;
  /** A request in flight; asking twice would leave the first lock held with nothing to release it. */
  private requesting = false;

  private readonly wanted = computed(
    () =>
      this.settings.keepAwake() &&
      this.visibility.visible() &&
      (this.metronome.isPlaying() || this.tuner.isListening()),
  );

  constructor() {
    // The browser releases the lock whenever the page is hidden, so it is requested again on return.
    effect(() => {
      if (this.wanted()) void this.acquire();
      else this.release();
    });
  }

  private async acquire(): Promise<void> {
    if (this.sentinel || this.requesting || !('wakeLock' in navigator)) return;
    this.requesting = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      });
      this.sentinel = sentinel;
    } catch {
      // Low battery mode or an unsupported browser: the screen just dims as usual.
    } finally {
      this.requesting = false;
    }
    // Playback stopped while the request was pending.
    if (!this.wanted()) this.release();
  }

  private release(): void {
    void this.sentinel?.release();
    this.sentinel = null;
  }
}
