import { Component, computed, inject, input, signal } from '@angular/core';
import type { Pulse } from '../music/meter';
import {
  QUICK_PICKS,
  durationTitle,
  groupingOptions,
  sameSignature,
  signatureLabel,
} from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { Surface } from '../ui/surface';
import { TimeSignatureSheet } from './time-signature-sheet';

/** Quick picks plus "More" for any meter up to 16 beats; scrolls on phones, wraps on wider screens. */
@Component({
  selector: 'app-time-signature-chips',
  imports: [SegmentedPills, Surface, TimeSignatureSheet],
  template: `
    <div class="flex gap-2" [class]="wraps() ? 'flex-wrap' : 'no-scrollbar overflow-x-auto px-5'">
      @for (signature of quickPicks; track label(signature)) {
        @let selected = isSelected(signature);
        <button
          type="button"
          appSurface
          pressed
          class="h-11 shrink-0 rounded-full px-4 text-[15px] tabular"
          [selected]="selected"
          (click)="store.setTimeSignature(signature)"
        >
          {{ label(signature) }}
        </button>
      }
      <button
        type="button"
        appSurface
        class="h-11 shrink-0 rounded-full px-4 text-[15px] tabular"
        aria-haspopup="dialog"
        [selected]="isCustom()"
        (click)="showCustom.set(true)"
      >
        {{ isCustom() ? label(store.timeSignature()) + ' ⋯' : 'More' }}
      </button>
    </div>

    @if (groupings().length > 0) {
      <div
        class="flex gap-2"
        role="group"
        aria-label="Grouping"
        [class]="wraps() ? 'flex-wrap' : 'no-scrollbar overflow-x-auto px-5'"
      >
        @for (option of groupings(); track option.join('+')) {
          <button
            type="button"
            appSurface
            pressed
            class="h-[34px] shrink-0 rounded-full px-3.5 text-sm tabular"
            [selected]="option.join('+') === store.grouping().join('+')"
            [attr.aria-label]="'Grouping ' + option.join(' plus ')"
            (click)="store.setGrouping(option)"
          >
            {{ option.join('+') }}
          </button>
        }
      </div>
      <div class="flex items-center gap-3" [class.px-5]="!wraps()">
        <span class="text-sm text-muted" aria-hidden="true">Count</span>
        <app-segmented-pills
          class="max-w-72 flex-1"
          label="Count"
          [options]="pulses()"
          [value]="store.pulse()"
          (valueChange)="store.setPulse($event)"
        />
      </div>
    }

    @if (showCustom()) {
      <app-time-signature-sheet (closed)="showCustom.set(false)" />
    }
  `,
  host: { class: 'flex flex-col gap-2' },
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
  /** Every note (11 in 11/8) or every group (4 for 3+3+3+2), which makes the beats uneven. */
  protected readonly pulses = computed<PillOption<Pulse>[]>(() => {
    const { beats, unit } = this.store.timeSignature();
    const notes = unit === 2 ? 'Halves' : `${capitalize(durationTitle(1, unit))}s`;
    return [
      { value: 'unit', label: `${notes} · ${beats}` },
      { value: 'group', label: `Groups · ${this.store.grouping().length}` },
    ];
  });

  protected isSelected(signature: Parameters<typeof signatureLabel>[0]): boolean {
    return sameSignature(signature, this.store.timeSignature());
  }
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
