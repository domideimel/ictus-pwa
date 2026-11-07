import { Component, inject, output } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { CLICK_SOUNDS } from '../audio/click-synth';
import type { AccidentalStyle } from '../music/note';
import type { ClefSetting } from '../music/staff';
import { CLEF_SETTINGS, clefSettingTitle } from '../music/staff';
import {
  PEDAL_MODES,
  REFERENCE_PITCH_RANGE,
  SettingsStore,
  TOLERANCE_OPTIONS,
} from '../state/settings.store';
import { NumberStepper } from '../ui/number-stepper';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { SettingsGroup, SettingsRow } from '../ui/settings-group';
import { Sheet } from '../ui/sheet';
import { ToggleSwitch } from '../ui/toggle-switch';

/** Settings grouped as in the concept: Tuner, Metronome, General. Every change is saved at once. */
@Component({
  selector: 'app-settings-sheet',
  imports: [
    Sheet,
    SettingsGroup,
    SettingsRow,
    NumberStepper,
    SegmentedPills,
    ToggleSwitch,
    FormField,
  ],
  templateUrl: './settings-sheet.html',
})
export class SettingsSheet {
  private readonly store = inject(SettingsStore);
  readonly closed = output();

  protected readonly settingsForm = form(this.store.editable, (path) => {
    min(path.referencePitch, REFERENCE_PITCH_RANGE.min);
    max(path.referencePitch, REFERENCE_PITCH_RANGE.max);
    for (const volume of [
      path.accentVolume,
      path.beatVolume,
      path.subdivisionVolume,
      path.polyVolume,
    ]) {
      min(volume, 0);
      max(volume, 1);
    }
  });

  protected readonly tolerances: PillOption<number>[] = TOLERANCE_OPTIONS.map((value) => ({
    value,
    label: `±${value} ¢`,
  }));
  protected readonly clefs: PillOption<ClefSetting>[] = CLEF_SETTINGS.map((value) => ({
    value,
    label: clefSettingTitle(value),
  }));
  protected readonly accidentals: PillOption<AccidentalStyle>[] = [
    { value: 'sharps', label: '♯ Sharps' },
    { value: 'flats', label: '♭ Flats' },
  ];
  protected readonly sounds = CLICK_SOUNDS;
  protected readonly pedalModes = PEDAL_MODES;
  protected readonly volumes = [
    { label: 'Accent', field: this.settingsForm.accentVolume },
    { label: 'Beat', field: this.settingsForm.beatVolume },
    { label: 'Subdivision', field: this.settingsForm.subdivisionVolume },
    { label: 'Polyrhythm', field: this.settingsForm.polyVolume },
  ];
}
