import { Component, input, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

/** iOS-style switch; a signal-forms checkbox control, bind with `[formField]`. */
@Component({
  selector: 'app-toggle-switch',
  template: `
    <button
      type="button"
      role="switch"
      class="relative h-[31px] w-[51px] rounded-full transition-colors disabled:opacity-40"
      [class]="checked() ? 'bg-accent' : 'bg-stroke'"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="checked.set(!checked())"
    >
      <span
        class="absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow transition-transform motion-reduce:transition-none"
        [class.translate-x-5]="checked()"
      ></span>
    </button>
  `,
})
export class ToggleSwitch implements FormCheckboxControl {
  readonly checked = model(false);
  readonly label = input.required<string>();
  readonly disabled = input(false);
}
