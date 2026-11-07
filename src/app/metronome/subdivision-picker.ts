import { Component, inject, input } from '@angular/core';
import { MetronomeStore } from '../state/metronome.store';

/**
 * The note of the meter down to sextuplets, named after what plays: Quarter … in 4/4, Eighth … in 11/8,
 * and Beat first when counting in groups. Symbol above the label on phones, beside it on wider screens.
 */
@Component({
  selector: 'app-subdivision-picker',
  templateUrl: './subdivision-picker.html',
  host: {
    role: 'radiogroup',
    'aria-label': 'Subdivision',
    class: 'grid gap-1 rounded-14 border border-stroke bg-surface p-1',
    '[class]': 'horizontal() ? "grid-cols-3" : "grid-cols-6"',
  },
})
export class SubdivisionPicker {
  protected readonly store = inject(MetronomeStore);
  /** Symbol beside the label (tablet/desktop) instead of above it (phone). */
  readonly horizontal = input(false);
}
