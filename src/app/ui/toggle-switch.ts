import { Component, input, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

/** iOS-style switch; a signal-forms checkbox control, bind with `[formField]`. */
@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.html',
})
export class ToggleSwitch implements FormCheckboxControl {
  readonly checked = model(false);
  readonly label = input.required<string>();
  readonly disabled = input(false);
}
