import { Component, computed, inject, output, viewChild } from '@angular/core';
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
  templateUrl: './practice-sheet.html',
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

  protected readonly activeSummary = computed(() => {
    const count = this.store.activePractice().length;
    return count === 1 ? '1 tool on' : `${count} tools on`;
  });

  private readonly sheet = viewChild.required(Sheet);

  protected startRest(): void {
    const { restBars, restAudible } = this.store.practice();
    this.sheet().close();
    this.store.startRest(restBars, restAudible);
  }
}
