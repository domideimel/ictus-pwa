import { Component, inject, input } from '@angular/core';
import { MetronomeStore } from '../state/metronome.store';

/**
 * The note of the meter down to sextuplets, named after what plays: Quarter … in 4/4, Eighth … in 11/8,
 * and Beat first when counting in groups. Symbol above the label on phones, beside it on wider screens.
 */
@Component({
  selector: 'app-subdivision-picker',
  template: `
    @for (option of store.subdivisionOptions(); track option.value) {
      @let selected = store.subdivision() === option.value;
      <button
        type="button"
        role="radio"
        class="flex h-14 min-w-0 items-center justify-center rounded-[10px]"
        [class]="
          (horizontal() ? 'gap-2.5 ' : 'flex-col ') +
          (selected ? 'bg-accent text-on-accent' : 'text-fg')
        "
        [attr.aria-checked]="selected"
        [attr.aria-label]="option.title"
        (click)="store.setSubdivision(option.value)"
      >
        <span class="flex items-start leading-none" aria-hidden="true">
          <span class="font-music" [class]="option.value === 3 ? 'text-xl' : 'text-[26px]'">{{
            option.symbol
          }}</span>
          @if (option.tuplet) {
            <span class="ms-0.5 text-[10.5px] font-bold">{{ option.tuplet }}</span>
          }
        </span>
        <span
          class="whitespace-nowrap"
          [class]="
            (horizontal() ? 'text-sm ' : 'text-[10px] tracking-tighter ') +
            (selected ? 'font-semibold' : 'text-muted')
          "
        >
          {{ option.title }}
        </span>
      </button>
    }
  `,
  host: {
    role: 'radiogroup',
    'aria-label': 'Subdivision',
    class: 'grid gap-1 rounded-[14px] border border-stroke bg-surface p-1',
    '[class]': 'horizontal() ? "grid-cols-3" : "grid-cols-6"',
  },
})
export class SubdivisionPicker {
  protected readonly store = inject(MetronomeStore);
  /** Symbol beside the label (tablet/desktop) instead of above it (phone). */
  readonly horizontal = input(false);
}
