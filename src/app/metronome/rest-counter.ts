import { Component, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { signatureLabel } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import { HeaderIconButton } from '../ui/header-icon-button';
import { SectionLabel } from '../ui/section-label';
import { Surface } from '../ui/surface';

/** Full-screen bar counter for long rests, e.g. 87 bars tacet. */
@Component({
  selector: 'app-rest-counter',
  imports: [HeaderIconButton, SectionLabel, Surface],
  template: `
    <dialog
      #dialog
      class="m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 text-fg"
      aria-label="Rest counter"
      (cancel)="$event.preventDefault(); store.endRest()"
    >
      @if (store.rest(); as rest) {
        <div class="mx-auto flex h-full max-w-xl flex-col px-5 pt-3 safe-top safe-bottom">
          <header class="flex items-center justify-between">
            <div class="flex flex-col gap-0.5">
              <app-section-label>Rest</app-section-label>
              <span class="text-[17px] font-semibold tabular"
                >{{ store.bpm() }} BPM · {{ signature() }}</span
              >
            </div>
            <app-header-icon-button icon="close" label="Close" (pressed)="store.endRest()" />
          </header>

          <div class="flex flex-1 flex-col items-center justify-center" aria-live="polite">
            @if (rest.finished) {
              <p class="text-8xl font-bold text-accent-text">Play!</p>
              <p class="mt-3 text-lg text-muted">{{ rest.bars }} bars done</p>
            } @else {
              <p
                class="text-[min(180px,40vw)] leading-none font-semibold tracking-[-0.04em] tabular"
                aria-atomic="true"
              >
                {{ bar() }}
              </p>
              <p class="mt-2 text-[22px] font-medium text-muted">of {{ rest.bars }}</p>
              <p
                class="mt-1 text-[17px]"
                [class]="rest.bars - bar() <= 2 ? 'text-accent-text' : 'text-muted'"
              >
                {{ rest.bars - bar() }} to go
              </p>
              <div class="mt-8 flex gap-3" aria-hidden="true">
                @for (beat of beats(); track beat) {
                  <span
                    class="size-3.5 rounded-full"
                    [class]="store.currentBeat() === beat ? 'bg-accent' : 'bg-stroke'"
                  ></span>
                }
              </div>
            }
          </div>

          <button
            type="button"
            appSurface
            class="mb-4 h-14 rounded-2xl text-[17px] font-semibold"
            (click)="rest.finished ? store.endRest() : store.startRest(rest.bars, rest.audible)"
          >
            {{ rest.finished ? 'Done' : 'Restart' }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class RestCounter {
  protected readonly store = inject(MetronomeStore);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly signature = computed(() => signatureLabel(this.store.timeSignature()));
  protected readonly bar = computed(() =>
    Math.min(this.store.currentBar() + 1, this.store.rest()?.bars ?? 1),
  );
  protected readonly beats = computed(() =>
    Array.from({ length: this.store.timeSignature().beats }, (_, i) => i),
  );

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
}
