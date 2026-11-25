import { Component, inject, output, signal } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { LgButton } from '@domideimel/ng-liquid-glass/button';
import { LgFormField, LgLabel } from '@domideimel/ng-liquid-glass/forms';
import { LgNumberField } from '@domideimel/ng-liquid-glass/number-field';
import { withUnit } from '../shared/numbers';
import { REFERENCE_PITCH_RANGE, SettingsStore } from '../state/settings.store';
import { Icon } from '../ui/icon';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { Sheet } from '../ui/sheet';

/** Large number field and quick picks. The signal form edits the stored settings, so changes apply live. */
@Component({
  selector: 'app-reference-pitch-sheet',
  imports: [Sheet, FormField, LgFormField, LgLabel, LgNumberField, SegmentedPills],
  templateUrl: './reference-pitch-sheet.html',
})
export class ReferencePitchSheet {
  protected readonly settings = inject(SettingsStore);
  readonly closed = output();

  protected readonly hz = withUnit('Hz');
  protected readonly quickPicks: PillOption<number>[] = [440, 441, 442, 443].map((value) => ({
    value,
    label: String(value),
  }));
  protected readonly pitchForm = form(this.settings.editable, (path) => {
    min(path.referencePitch, REFERENCE_PITCH_RANGE.min);
    max(path.referencePitch, REFERENCE_PITCH_RANGE.max);
  });
}

/** "A = 442 Hz" button that opens a small sheet to change the reference pitch on the spot. */
@Component({
  selector: 'app-reference-pitch-button',
  imports: [Icon, LgButton, ReferencePitchSheet],
  templateUrl: './reference-pitch-button.html',
})
export class ReferencePitchButton {
  protected readonly settings = inject(SettingsStore);
  protected readonly editing = signal(false);
}
