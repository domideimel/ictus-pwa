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
    if (this.sentinel || !('wakeLock' in navigator)) return;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      });
      this.sentinel = sentinel;
      if (!this.wanted()) this.release();
    } catch {
      // Low battery mode or an unsupported browser: the screen just dims as usual.
    }
  }

  private release(): void {
    void this.sentinel?.release();
    this.sentinel = null;
  }
}
