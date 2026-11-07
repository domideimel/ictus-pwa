import { Component, computed, inject, input } from '@angular/core';
import type { TunerMode } from '../state/settings.store';
import { SettingsStore } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';
import { Icon } from '../ui/icon';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { SectionLabel } from '../ui/section-label';
import { DrumTuning } from './drum-tuning';
import { ReferencePitchButton } from './reference-pitch';
import { StaffCard } from './staff-card';
import { CentsMeter, FrequencyLabel, NoteName, TuningStatePill } from './tuner-readouts';

/** Starts and stops listening; the microphone stays off until this is pressed. */
@Component({
  selector: 'app-tuner-toggle',
  imports: [Icon],
  templateUrl: './tuner-toggle.html',
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
    FrequencyLabel,
    NoteName,
    ReferencePitchButton,
    SectionLabel,
    SegmentedPills,
    StaffCard,
    TunerToggle,
    TuningStatePill,
  ],
  templateUrl: './tuner-panel.html',
  host: { class: 'flex min-h-0 flex-col' },
})
export class TunerPanel {
  protected readonly tuner = inject(TunerStore);
  private readonly settings = inject(SettingsStore);
  readonly wide = input(false);

  protected readonly modes: PillOption<TunerMode>[] = [
    { value: 'chromatic', label: 'Chromatic' },
    { value: 'drum', label: 'Drum lugs' },
  ];
  protected readonly mode = computed(() => this.settings.tunerMode());

  /**
   * Why the tuner hears nothing. The chromatic tuner's state pill already says it is paused for the
   * click; the drum tuner has no pill, so it says so here.
   */
  protected readonly notice = computed(() => {
    if (this.tuner.microphoneDenied())
      return 'Microphone access is off. Allow it for this site in your browser or system settings, then press Start again.';
    if (this.mode() === 'drum' && this.tuner.isPausedForClick())
      return 'Paused while the click plays. Stop the metronome to keep tuning.';
    return null;
  });

  protected setMode(tunerMode: TunerMode): void {
    this.settings.update({ tunerMode });
  }
}
