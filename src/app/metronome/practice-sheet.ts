import { Component, inject, output, viewChild } from '@angular/core';
import { FormField, disabled, form, max, min } from '@angular/forms/signals';
import { BPM_RANGE } from '../music/meter';
import type { Polyrhythm } from '../music/practice';
import {
  GAP_BAR_RANGE,
  POLYRHYTHMS,
  REST_BAR_RANGE,
  TRAINER_BAR_RANGE,
  TRAINER_STEP_RANGE,
} from '../music/practice';
import { MetronomeStore } from '../state/metronome.store';
import { NumberStepper } from '../ui/number-stepper';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { SettingsGroup, SettingsRow } from '../ui/settings-group';
import { Sheet } from '../ui/sheet';
import { ToggleSwitch } from '../ui/toggle-switch';

/**
 * Practice tools behind the dumbbell button. The signal form edits the stored practice setup directly,
 * so every change applies to the running click at once and is remembered.
 */
@Component({
  selector: 'app-practice-sheet',
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
    <app-sheet title="Practice" (closed)="closed.emit()">
      <form class="flex flex-col gap-5" (submit)="$event.preventDefault()">
        <app-settings-group
          title="Gap click"
          footnote="Plays some bars, then stays silent so you keep time on your own."
        >
          <app-settings-row label="On">
            <app-toggle-switch label="Gap click" [formField]="practice.gapClick.enabled" />
          </app-settings-row>
          <hr />
          <app-settings-row label="Play bars">
            <app-number-stepper label="Play bars" [formField]="practice.gapClick.play" />
          </app-settings-row>
          <hr />
          <app-settings-row label="Mute bars">
            <app-number-stepper label="Mute bars" [formField]="practice.gapClick.mute" />
          </app-settings-row>
        </app-settings-group>

        <app-settings-group
          title="Polyrhythm"
          footnote="3:2 plays three even clicks in a higher sound across every two beats."
        >
          <app-settings-row label="Pattern">
            <app-segmented-pills
              class="w-52"
              label="Polyrhythm"
              [options]="polyrhythms"
              [formField]="practice.polyrhythm"
            />
          </app-settings-row>
        </app-settings-group>

        <app-settings-group
          title="Speed trainer"
          [footnote]="
            'Starts at the metronome tempo (' + store.bpm() + ' BPM) and speeds up on the bar line.'
          "
        >
          <app-settings-row label="On">
            <app-toggle-switch label="Speed trainer" [formField]="practice.speedTrainer.enabled" />
          </app-settings-row>
          <hr />
          <app-settings-row label="Raise by">
            <app-number-stepper
              label="Raise by"
              unit=" BPM"
              [formField]="practice.speedTrainer.step"
            />
          </app-settings-row>
          <hr />
          <app-settings-row label="Every">
            <app-number-stepper
              label="Every"
              unit=" bars"
              [formField]="practice.speedTrainer.everyBars"
            />
          </app-settings-row>
          <hr />
          <app-settings-row label="Target BPM">
            <app-number-stepper
              label="Target BPM"
              [steps]="[1, 10]"
              [formField]="practice.speedTrainer.target"
            />
          </app-settings-row>
        </app-settings-group>

        <app-settings-group
          title="Rest counter"
          footnote="Counts bars at the current tempo and meter with a big bar number, and signals your entrance."
        >
          <app-settings-row label="Bars tacet">
            <app-number-stepper
              label="Bars tacet"
              [steps]="[1, 10]"
              [formField]="practice.restBars"
            />
          </app-settings-row>
          <hr />
          <app-settings-row label="Click audible">
            <app-toggle-switch label="Click audible" [formField]="practice.restAudible" />
          </app-settings-row>
          <hr />
          <div class="p-3">
            <button
              type="button"
              class="h-12 w-full rounded-xl bg-accent text-base font-semibold text-on-accent"
              (click)="startRest()"
            >
              Start counting
            </button>
          </div>
        </app-settings-group>
      </form>
    </app-sheet>
  `,
})
export class PracticeSheet {
  protected readonly store = inject(MetronomeStore);
  readonly closed = output();

  protected readonly polyrhythms: PillOption<Polyrhythm>[] = POLYRHYTHMS.map((value) => ({
    value,
    label: value === 'off' ? 'Off' : value,
  }));

  protected readonly practice = form(this.store.editablePractice, (path) => {
    min(path.gapClick.play, GAP_BAR_RANGE.min);
    max(path.gapClick.play, GAP_BAR_RANGE.max);
    min(path.gapClick.mute, GAP_BAR_RANGE.min);
    max(path.gapClick.mute, GAP_BAR_RANGE.max);
    disabled(path.gapClick.play, { when: ({ valueOf }) => !valueOf(path.gapClick.enabled) });
    disabled(path.gapClick.mute, { when: ({ valueOf }) => !valueOf(path.gapClick.enabled) });

    min(path.speedTrainer.step, TRAINER_STEP_RANGE.min);
    max(path.speedTrainer.step, TRAINER_STEP_RANGE.max);
    min(path.speedTrainer.everyBars, TRAINER_BAR_RANGE.min);
    max(path.speedTrainer.everyBars, TRAINER_BAR_RANGE.max);
    min(path.speedTrainer.target, BPM_RANGE.min);
    max(path.speedTrainer.target, BPM_RANGE.max);
    disabled(path.speedTrainer.step, {
      when: ({ valueOf }) => !valueOf(path.speedTrainer.enabled),
    });
    disabled(path.speedTrainer.everyBars, {
      when: ({ valueOf }) => !valueOf(path.speedTrainer.enabled),
    });
    disabled(path.speedTrainer.target, {
      when: ({ valueOf }) => !valueOf(path.speedTrainer.enabled),
    });

    min(path.restBars, REST_BAR_RANGE.min);
    max(path.restBars, REST_BAR_RANGE.max);
  });

  private readonly sheet = viewChild.required(Sheet);

  protected startRest(): void {
    const { restBars, restAudible } = this.store.practice();
    this.sheet().close();
    this.store.startRest(restBars, restAudible);
  }
}
