import { Component, inject, input } from '@angular/core';
import { lgUniqueId } from '@domideimel/ng-liquid-glass';
import { MetronomeStore } from '../state/metronome.store';

/**
 * The note of the meter down to sextuplets, named after what plays: Quarter … in 4/4, Eighth … in 11/8,
 * and Beat first when counting in groups. Symbol above the label on phones, beside it on wider screens.
 * Native radios styled like `lgSegment`: the selected note is a raised segment, as in every segmented control.
 */
@Component({
  selector: 'app-subdivision-picker',
  templateUrl: './subdivision-picker.html',
  host: { class: 'block' },
})
export class SubdivisionPicker {
  protected readonly store = inject(MetronomeStore);
  /** Symbol beside the label (tablet/desktop) instead of above it (phone). */
  readonly horizontal = input(false);

  protected readonly name = lgUniqueId('app-subdivision');
}
