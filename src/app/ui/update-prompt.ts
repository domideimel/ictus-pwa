import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';

/** Offers a reload when the service worker has downloaded a new version, instead of switching mid-rehearsal. */
@Component({
  selector: 'app-update-banner',
  template: `
    @if (ready()) {
      <div
        role="status"
        class="fixed inset-x-4 bottom-24 z-10 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-stroke bg-surface p-3 ps-4 text-[15px] shadow-lg md:bottom-6"
      >
        A new version of Ictus is ready.
        <button
          type="button"
          class="h-11 rounded-xl bg-accent px-4 font-semibold text-on-accent"
          (click)="reload()"
        >
          Reload
        </button>
      </div>
    }
  `,
})
export class UpdateBanner {
  private readonly updates = inject(SwUpdate);

  protected readonly ready = toSignal(
    this.updates.versionUpdates.pipe(
      filter((event) => event.type === 'VERSION_READY'),
      map(() => true),
    ),
    { initialValue: false },
  );

  protected reload(): void {
    document.location.reload();
  }
}
