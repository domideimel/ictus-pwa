import { Component, inject, input } from '@angular/core';
import { MetronomeStore } from '../state/metronome.store';
import { focusRadio, radioKeyTarget } from '../ui/radio-keys';

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
    '(keydown)': 'onKeydown($event)',
  },
})
export class SubdivisionPicker {
  protected readonly store = inject(MetronomeStore);
  /** Symbol beside the label (tablet/desktop) instead of above it (phone). */
  readonly horizontal = input(false);

  /** One tab stop; the arrows, Home and End move the selection, as in a native radio group. */
  protected onKeydown(event: KeyboardEvent): void {
    const options = this.store.subdivisionOptions();
    const index = options.findIndex((option) => option.value === this.store.subdivision());
    const target = radioKeyTarget(event.key, index, options.length);
    const next = target === null ? undefined : options[target];
    if (target === null || !next) return;
    event.preventDefault();
    this.store.setSubdivision(next.value);
    focusRadio(event, target);
  }
}
