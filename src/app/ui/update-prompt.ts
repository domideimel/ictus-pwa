import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MetronomeStore } from '../state/metronome.store';
import { PageVisibility } from '../state/page-visibility';
import { Surface } from './surface';

/** An installed app can stay open for days, so it looks for a new version every half hour too. */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Popup offering a reload once the service worker has downloaded a new version. It waits while the
 * click plays or the rest counter runs, so it never interrupts a rehearsal; "Later" keeps the old
 * version until the next launch.
 */
@Component({
  selector: 'app-update-prompt',
  imports: [Surface],
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(21rem,calc(100vw-2rem))] rounded-[20px] border border-stroke bg-surface p-0 text-fg"
      aria-labelledby="update-title"
      aria-describedby="update-text"
      (close)="dismissed.set(true)"
    >
      <div class="flex flex-col gap-4 p-5">
        <div class="flex flex-col gap-1.5 text-center">
          <h2 id="update-title" class="text-[17px] font-semibold">Update available</h2>
          <p id="update-text" class="text-[15px] text-muted">
            {{
              broken()
                ? 'This version of Ictus can no longer load all of its files. Reload to continue.'
                : 'A new version of Ictus is ready. Reload to use it; your settings and setlists stay.'
            }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            appSurface
            class="h-11 rounded-xl font-semibold"
            (click)="dialog.close()"
          >
            Later
          </button>
          <button
            type="button"
            class="h-11 rounded-xl bg-accent font-semibold text-on-accent"
            (click)="reload()"
          >
            Reload
          </button>
        </div>
      </div>
    </dialog>
  `,
})
export class UpdatePrompt {
  private readonly updates = inject(SwUpdate);
  private readonly metronome = inject(MetronomeStore);
  private readonly visibility = inject(PageVisibility);
  private readonly document = inject(DOCUMENT);

  private readonly ready = signal(false);
  protected readonly broken = signal(false);
  protected readonly dismissed = signal(false);

  private readonly show = computed(
    () =>
      (this.ready() || this.broken()) &&
      !this.dismissed() &&
      !this.metronome.isPlaying() &&
      !this.metronome.rest(),
  );

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    if (!this.updates.isEnabled) return;

    const events = this.updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.ready.set(true);
        this.dismissed.set(false);
      }
    });
    const failures = this.updates.unrecoverable.subscribe(() => {
      this.broken.set(true);
      this.dismissed.set(false);
    });
    const timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => {
      events.unsubscribe();
      failures.unsubscribe();
      clearInterval(timer);
    });

    // Coming back to the app (e.g. unlocking the phone) is a good moment to look.
    effect(() => {
      if (this.visibility.visible()) this.check();
    });

    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.show() && !dialog.open) dialog.showModal();
    });
  }

  protected reload(): void {
    this.document.location.reload();
  }

  private check(): void {
    this.updates.checkForUpdate().catch(() => {
      // Offline: try again on the next interval or return to the app.
    });
  }
}
