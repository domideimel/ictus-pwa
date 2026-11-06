import { Component, inject, output, signal, viewChild } from '@angular/core';
import { FormField, form, max, min, submit } from '@angular/forms/signals';
import { BEAT_RANGE, BEAT_UNITS, TimeSignature } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import { NumberStepper } from '../ui/number-stepper';
import { PillOption, SegmentedPills } from '../ui/segmented-pills';
import { SettingsGroup, SettingsRow } from '../ui/settings-group';
import { Sheet } from '../ui/sheet';

/** Free input for meters beyond the quick picks: 1–16 beats over 2, 4, 8 or 16. */
@Component({
  selector: 'app-time-signature-sheet',
  imports: [Sheet, NumberStepper, SegmentedPills, SettingsGroup, SettingsRow, FormField],
  template: `
    <app-sheet title="Time signature" closeLabel="Cancel" (closed)="closed.emit()">
      <form class="flex flex-col gap-6" (submit)="apply($event)">
        <p class="text-center text-6xl font-semibold tabular" aria-live="polite">
          {{ model().beats }}/{{ model().unit }}
        </p>
        <app-settings-group title="Meter">
          <app-settings-row label="Beats per bar">
            <app-number-stepper label="Beats per bar" [formField]="signatureForm.beats" />
          </app-settings-row>
          <hr />
          <app-settings-row label="Beat unit">
            <app-segmented-pills
              class="w-44"
              label="Beat unit"
              [options]="units"
              [formField]="signatureForm.unit"
            />
          </app-settings-row>
        </app-settings-group>
        <button
          type="submit"
          class="h-12 rounded-xl bg-accent text-base font-semibold text-on-accent disabled:opacity-40"
          [disabled]="signatureForm().invalid()"
        >
          Use {{ model().beats }}/{{ model().unit }}
        </button>
      </form>
    </app-sheet>
  `,
})
export class TimeSignatureSheet {
  private readonly store = inject(MetronomeStore);
  readonly closed = output();

  protected readonly units: PillOption<number>[] = BEAT_UNITS.map((unit) => ({
    value: unit,
    label: String(unit),
  }));
  protected readonly model = signal<TimeSignature>({ ...this.store.timeSignature() });
  protected readonly signatureForm = form(this.model, (path) => {
    min(path.beats, BEAT_RANGE.min);
    max(path.beats, BEAT_RANGE.max);
  });

  private readonly sheet = viewChild.required(Sheet);

  protected apply(event: Event): void {
    event.preventDefault();
    void submit(this.signatureForm, async () => {
      this.store.setTimeSignature(this.model());
      this.sheet().close();
    });
  }
}
