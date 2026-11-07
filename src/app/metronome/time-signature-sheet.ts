import { Component, inject, output, signal, viewChild } from '@angular/core';
import { FormField, form, max, min, submit } from '@angular/forms/signals';
import type { TimeSignature } from '../music/meter';
import { BEAT_RANGE, BEAT_UNITS } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import { NumberStepper } from '../ui/number-stepper';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { SettingsGroup, SettingsRow } from '../ui/settings-group';
import { Sheet } from '../ui/sheet';

/** Free input for meters beyond the quick picks: 1–16 beats over 2, 4, 8 or 16. */
@Component({
  selector: 'app-time-signature-sheet',
  imports: [Sheet, NumberStepper, SegmentedPills, SettingsGroup, SettingsRow, FormField],
  templateUrl: './time-signature-sheet.html',
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
    void submit(this.signatureForm, () => {
      this.store.setTimeSignature(this.model());
      this.sheet().close();
      return Promise.resolve();
    });
  }
}
