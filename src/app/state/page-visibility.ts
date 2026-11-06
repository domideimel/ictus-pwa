import { DOCUMENT, DestroyRef, Service, inject, signal } from '@angular/core';

/** Whether the page is in the foreground; the tuner and the wake lock pause in the background. */
@Service()
export class PageVisibility {
  private readonly document = inject(DOCUMENT);
  private readonly state = signal(this.document.visibilityState === 'visible');
  readonly visible = this.state.asReadonly();

  constructor() {
    const update = (): void => {
      this.state.set(this.document.visibilityState === 'visible');
    };
    this.document.addEventListener('visibilitychange', update);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', update);
    });
  }
}
