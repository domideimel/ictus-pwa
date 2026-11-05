import { Component, computed, inject, input } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { SettingsStore, TunerMode } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';
import { Icon } from '../ui/icon';
import { PillOption, SegmentedPills } from '../ui/segmented-pills';
import { SectionLabel } from '../ui/section-label';
import { DrumTuning } from './drum-tuning';
import { ReferencePitchButton } from './reference-pitch';
import { StaffCard } from './staff-card';
import { CentsMeter, FrequencyLabel, NoteName, TuningStatePill } from './tuner-readouts';

/** Starts and stops listening; the microphone stays off until this is pressed. */
@Component({
  selector: 'app-tuner-toggle',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-on-accent active:opacity-80"
      [attr.aria-pressed]="tuner.switchedOn()"
      (click)="tuner.toggle()"
    >
      <app-icon [name]="tuner.switchedOn() ? 'stop' : 'mic'" [size]="20" [strokeWidth]="2" />
      {{ tuner.switchedOn() ? 'Stop tuner' : 'Start tuner' }}
    </button>
  `,
})
export class TunerToggle {
  protected readonly tuner = inject(TunerStore);
}

/**
 * Chromatic tuner and drum-lug tuner. Phone: full screen with the start button at the bottom.
 * Tablet and desktop: a card beside (or below) the metronome.
 */
@Component({
  selector: 'app-tuner-panel',
  imports: [
    CentsMeter,
    DrumTuning,
    FormField,
    FrequencyLabel,
    NoteName,
    ReferencePitchButton,
    SectionLabel,
    SegmentedPills,
    StaffCard,
    TunerToggle,
    TuningStatePill,
  ],
  host: { class: 'flex min-h-0 flex-col' },
  template: `
    @if (wide()) {
      <section
        aria-labelledby="tuner-title"
        class="flex flex-col gap-4 rounded-[20px] border border-stroke bg-panel p-6 lg:p-7"
      >
        <header class="flex flex-wrap items-center justify-between gap-3">
          <app-section-label id="tuner-title">Tuner</app-section-label>
          <div class="flex items-center gap-3">
            <app-reference-pitch-button />
            <app-tuner-toggle class="w-40" />
          </div>
        </header>
        <app-segmented-pills
          label="Tuner mode"
          [options]="modes"
          [formField]="modeForm.tunerMode"
        />
        @if (mode() === 'chromatic') {
          <div class="flex flex-col items-center gap-4">
            <app-staff-card class="w-full" />
            <div class="flex flex-wrap items-center justify-center gap-7">
              <app-note-name [size]="120" />
              <div class="flex flex-col gap-2.5">
                <app-tuning-state-pill class="self-start!" />
                <app-frequency-label />
              </div>
            </div>
            <app-cents-meter />
            @if (tuner.microphoneDenied()) {
              <p class="max-w-sm text-center text-sm text-accent-text">{{ micHelpText }}</p>
            }
          </div>
        } @else {
          <app-drum-tuning />
        }
      </section>
    } @else {
      <header class="flex items-center justify-between px-5 pt-3">
        <app-reference-pitch-button />
        <ng-content select="[headerEnd]" />
      </header>
      <app-segmented-pills
        class="mx-5 mt-3"
        label="Tuner mode"
        [options]="modes"
        [formField]="modeForm.tunerMode"
      />

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        @if (mode() === 'chromatic') {
          <div class="flex flex-col items-center px-5 pt-6 pb-4">
            <app-staff-card class="w-full" />
            <app-note-name class="mt-7" />
            <app-tuning-state-pill class="mt-4" />
            <app-cents-meter class="mt-6" />
            <app-frequency-label class="mt-2" />
            @if (tuner.microphoneDenied()) {
              <p class="mt-4 max-w-xs text-center text-sm text-accent-text">{{ micHelpText }}</p>
            }
          </div>
        } @else {
          <app-drum-tuning class="px-5 py-4" />
        }
      </div>

      <app-tuner-toggle class="px-5 pt-2 pb-3" />
    }
  `,
})
export class TunerPanel {
  protected readonly tuner = inject(TunerStore);
  private readonly settings = inject(SettingsStore);
  readonly wide = input(false);

  protected readonly modes: PillOption<TunerMode>[] = [
    { value: 'chromatic', label: 'Chromatic' },
    { value: 'drum', label: 'Drum lugs' },
  ];
  protected readonly modeForm = form(this.settings.settings);
  protected readonly mode = computed(() => this.settings.settings().tunerMode);
  protected readonly micHelpText =
    'Microphone access is off. Allow it for this site in your browser or system settings, then press Start again.';
}
