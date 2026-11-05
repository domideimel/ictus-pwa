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
  template: `
    <app-sheet title="Reference pitch" (closed)="closed.emit()">
      <form class="flex flex-col items-center gap-5 pb-2" (submit)="$event.preventDefault()">
        <app-number-stepper
          class="text-2xl"
          label="Reference pitch"
          unit=" Hz"
          [formField]="pitchForm.referencePitch"
        />
        <div
          class="grid w-full grid-cols-4 gap-2"
          role="group"
          aria-label="Common reference pitches"
        >
          @for (value of quickPicks; track value) {
            <button
              type="button"
              appSurface
              pressed
              [selected]="settings.referencePitch() === value"
              class="h-10 rounded-full text-[15px] tabular"
              (click)="settings.update({ referencePitch: value })"
            >
              {{ value }}
            </button>
          }
        </div>
      </form>
    </app-sheet>
  `,
})
export class ReferencePitchSheet {
  protected readonly settings = inject(SettingsStore);
  readonly closed = output();

  protected readonly quickPicks = [440, 441, 442, 443];
  protected readonly pitchForm = form(this.settings.settings, (path) => {
    min(path.referencePitch, REFERENCE_PITCH_RANGE.min);
    max(path.referencePitch, REFERENCE_PITCH_RANGE.max);
  });
}

/** "A = 442 Hz" button that opens a small sheet to change the reference pitch on the spot. */
@Component({
  selector: 'app-reference-pitch-button',
  imports: [Icon, Surface, ReferencePitchSheet],
  template: `
    <button
      type="button"
      appSurface
      class="h-11 gap-2 rounded-full px-4 text-[15px] font-semibold tabular"
      aria-haspopup="dialog"
      [attr.aria-label]="'Reference pitch A equals ' + settings.referencePitch() + ' hertz, change'"
      (click)="editing.set(true)"
    >
      A = {{ settings.referencePitch() }} Hz
      <app-icon name="chevron-down" class="text-muted" [size]="14" [strokeWidth]="2.2" />
    </button>
    @if (editing()) {
      <app-reference-pitch-sheet (closed)="editing.set(false)" />
    }
  `,
})
export class ReferencePitchButton {
  protected readonly settings = inject(SettingsStore);
  protected readonly editing = signal(false);
}
