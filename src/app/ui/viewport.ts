import { DOCUMENT, DestroyRef, Service, computed, inject, signal } from '@angular/core';

/** Window size and pointer type as signals, for layout decisions that CSS breakpoints can't make alone. */
@Service()
export class Viewport {
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly size = signal({
    width: this.window?.innerWidth ?? 1024,
    height: this.window?.innerHeight ?? 768,
  });
  readonly width = computed(() => this.size().width);
  readonly height = computed(() => this.size().height);

  /** md breakpoint: metronome and tuner side by side or stacked on one screen, like the iPad app. */
  readonly isWide = computed(() => this.size().width >= 768);

  private readonly fine = signal(this.window?.matchMedia?.('(pointer: fine)').matches ?? false);
  /** Mouse or trackpad: copy says "click" instead of "tap". */
  readonly finePointer = this.fine.asReadonly();

  constructor() {
    const window = this.window;
    if (!window?.matchMedia) return;
    const resize = (): void =>
      this.size.set({ width: window.innerWidth, height: window.innerHeight });
    const pointer = window.matchMedia('(pointer: fine)');
    const pointerChange = (): void => this.fine.set(pointer.matches);
    window.addEventListener('resize', resize, { passive: true });
    pointer.addEventListener('change', pointerChange);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('resize', resize);
      pointer.removeEventListener('change', pointerChange);
    });
  }
}
