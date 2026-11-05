import { Component, computed, inject, input, signal } from '@angular/core';
import { QUICK_PICKS, groupingOptions, sameSignature, signatureLabel } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import { Surface } from '../ui/surface';
import { TimeSignatureSheet } from './time-signature-sheet';

/** Quick picks plus "More" for any meter up to 16 beats; scrolls on phones, wraps on wider screens. */
@Component({
  selector: 'app-time-signature-chips',
  imports: [Surface, TimeSignatureSheet],
  host: { class: 'flex flex-col gap-2' },
  template: `
    <div class="flex gap-2" [class]="wraps() ? 'flex-wrap' : 'no-scrollbar overflow-x-auto px-5'">
      @for (signature of quickPicks; track label(signature)) {
        @let selected = isSelected(signature);
        <button
          type="button"
          appSurface
          pressed
          [selected]="selected"
          class="h-11 shrink-0 rounded-full px-4 text-[15px] tabular"
          (click)="store.setTimeSignature(signature)"
        >
          {{ label(signature) }}
        </button>
      }
      <button
        type="button"
        appSurface
        [selected]="isCustom()"
        class="h-11 shrink-0 rounded-full px-4 text-[15px] tabular"
        aria-haspopup="dialog"
        (click)="showCustom.set(true)"
      >
        {{ isCustom() ? label(store.timeSignature()) + ' ⋯' : 'More' }}
      </button>
    </div>

    @if (groupings().length > 0) {
      <div
        class="flex gap-2"
        [class]="wraps() ? 'flex-wrap' : 'no-scrollbar overflow-x-auto px-5'"
        role="group"
        aria-label="Grouping"
      >
        @for (option of groupings(); track option.join('+')) {
          <button
            type="button"
            appSurface
            pressed
            [selected]="option.join('+') === store.grouping().join('+')"
            class="h-[34px] shrink-0 rounded-full px-3.5 text-sm tabular"
            [attr.aria-label]="'Grouping ' + option.join(' plus ')"
            (click)="store.setGrouping(option)"
          >
            {{ option.join('+') }}
          </button>
        }
      </div>
    }

    @if (showCustom()) {
      <app-time-signature-sheet (closed)="showCustom.set(false)" />
    }
  `,
})
export class TimeSignatureChips {
  protected readonly store = inject(MetronomeStore);
  readonly wraps = input(false);

  protected readonly quickPicks = QUICK_PICKS;
  protected readonly showCustom = signal(false);
  protected readonly label = signatureLabel;
  protected readonly isCustom = computed(
    () => !QUICK_PICKS.some((pick) => sameSignature(pick, this.store.timeSignature())),
  );
  /** Grouping for odd meters, e.g. 7/8 as 2+2+3 or 3+2+2. Empty for simple meters. */
  protected readonly groupings = computed(() => groupingOptions(this.store.timeSignature()));

  protected isSelected(signature: Parameters<typeof signatureLabel>[0]): boolean {
    return sameSignature(signature, this.store.timeSignature());
  }
}
