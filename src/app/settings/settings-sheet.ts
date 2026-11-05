import { Component, inject, output } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
import { CLICK_SOUNDS } from '../audio/click-synth';
import { AccidentalStyle } from '../music/note';
import { CLEF_SETTINGS, ClefSetting, clefSettingTitle } from '../music/staff';
import {
  PEDAL_MODES,
  REFERENCE_PITCH_RANGE,
  SettingsStore,
  TOLERANCE_OPTIONS,
} from '../state/settings.store';
import { NumberStepper } from '../ui/number-stepper';
import { PillOption, SegmentedPills } from '../ui/segmented-pills';
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
  template: `
    <app-sheet title="Settings" (closed)="closed.emit()">
      <form class="flex flex-col gap-5" (submit)="$event.preventDefault()">
        <app-settings-group title="Tuner">
          <app-settings-row label="Reference pitch">
            <app-number-stepper
              label="Reference pitch"
              unit=" Hz"
              [formField]="settingsForm.referencePitch"
            />
          </app-settings-row>
          <hr />
          <app-settings-row label="Tolerance">
            <app-segmented-pills
              class="w-44"
              label="Tolerance"
              [options]="tolerances"
              [formField]="settingsForm.tolerance"
            />
          </app-settings-row>
          <hr />
          <app-settings-row label="Clef">
            <app-segmented-pills
              class="w-48"
              label="Clef"
              [options]="clefs"
              [formField]="settingsForm.clef"
            />
          </app-settings-row>
          <hr />
          <app-settings-row label="Accidentals">
            <app-segmented-pills
              class="w-40"
              label="Accidentals"
              [options]="accidentals"
              [formField]="settingsForm.accidentals"
            />
          </app-settings-row>
        </app-settings-group>

        <app-settings-group title="Metronome">
          <app-settings-row label="Click sound">
            <select
              class="h-11 rounded-[10px] bg-transparent px-2 text-muted"
              aria-label="Click sound"
              [formField]="settingsForm.clickSound"
            >
              @for (sound of sounds; track sound.value) {
                <option [value]="sound.value">{{ sound.title }}</option>
              }
            </select>
          </app-settings-row>
          @for (volume of volumes; track volume.label) {
            <hr />
            <label class="flex min-h-12 items-center gap-3 px-4 text-[15px]">
              <span class="w-26 shrink-0">{{ volume.label }}</span>
              <input
                type="range"
                step="0.01"
                class="h-11 min-w-0 flex-1 accent-accent"
                [formField]="volume.field"
              />
            </label>
          }
          <hr />
          <app-settings-row label="Visual flash">
            <app-toggle-switch label="Visual flash" [formField]="settingsForm.visualFlash" />
          </app-settings-row>
          <hr />
          <app-settings-row label="Vibration">
            <app-toggle-switch label="Vibration" [formField]="settingsForm.vibration" />
          </app-settings-row>
        </app-settings-group>

        <app-settings-group
          title="General"
          footnote="Bluetooth page-turner pedals: the left pedal sends ←, ↑ or Page Up, the right pedal →, ↓ or Page Down. Space always starts and stops, T taps the tempo."
        >
          <app-settings-row label="Keep screen awake">
            <app-toggle-switch label="Keep screen awake" [formField]="settingsForm.keepAwake" />
          </app-settings-row>
          <hr />
          <app-settings-row label="Pedal">
            <select
              class="h-11 max-w-[60%] rounded-[10px] bg-transparent px-2 text-muted"
              aria-label="Pedal"
              [formField]="settingsForm.pedalMode"
            >
              @for (mode of pedalModes; track mode.value) {
                <option [value]="mode.value">{{ mode.label }}</option>
              }
            </select>
          </app-settings-row>
        </app-settings-group>
        <p class="-mt-3 px-1 text-xs text-muted">
          Dark mode follows your system setting. Vibration works on Android only; iOS browsers can't
          vibrate.
        </p>
      </form>
    </app-sheet>
  `,
})
export class SettingsSheet {
  private readonly store = inject(SettingsStore);
  readonly closed = output();

  protected readonly settingsForm = form(this.store.settings, (path) => {
    min(path.referencePitch, REFERENCE_PITCH_RANGE.min);
    max(path.referencePitch, REFERENCE_PITCH_RANGE.max);
    for (const volume of [path.accentVolume, path.beatVolume, path.subdivisionVolume]) {
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
  ];
}
