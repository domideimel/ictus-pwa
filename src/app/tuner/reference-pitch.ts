import { Component, inject, output, signal } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { REFERENCE_PITCH_RANGE, SettingsStore } from '../state/settings.store';
import { Icon } from '../ui/icon';
import { NumberStepper } from '../ui/number-stepper';
import { Sheet } from '../ui/sheet';
import { Surface } from '../ui/surface';

/** Large stepper and quick picks. The signal form edits the stored settings, so changes apply live. */
@Component({
  selector: 'app-reference-pitch-sheet',
  imports: [Sheet, NumberStepper, Surface, FormField],
  templateUrl: './reference-pitch-sheet.html',
})
export class ReferencePitchSheet {
  protected readonly settings = inject(SettingsStore);
  readonly closed = output();

  protected readonly quickPicks = [440, 441, 442, 443];
  protected readonly pitchForm = form(this.settings.editable, (path) => {
    min(path.referencePitch, REFERENCE_PITCH_RANGE.min);
    max(path.referencePitch, REFERENCE_PITCH_RANGE.max);
  });
}

/** "A = 442 Hz" button that opens a small sheet to change the reference pitch on the spot. */
@Component({
  selector: 'app-reference-pitch-button',
  imports: [Icon, Surface, ReferencePitchSheet],
  templateUrl: './reference-pitch-button.html',
})
export class ReferencePitchButton {
  protected readonly settings = inject(SettingsStore);
  protected readonly editing = signal(false);
}
