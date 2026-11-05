import { Service, computed } from '@angular/core';
import { ClickSound } from '../audio/click-synth';
import { AccidentalStyle } from '../music/note';
import { ClefSetting } from '../music/staff';
import { persistedSignal, withDefaults } from './storage';

export type PedalMode = 'tapAndStartStop' | 'previousAndNext';
export type TunerMode = 'chromatic' | 'drum';

export interface Settings {
  readonly referencePitch: number;
  readonly tolerance: number;
  readonly clef: ClefSetting;
  readonly accidentals: AccidentalStyle;
  readonly clickSound: ClickSound;
  readonly accentVolume: number;
  readonly beatVolume: number;
  readonly subdivisionVolume: number;
  readonly visualFlash: boolean;
  readonly vibration: boolean;
  readonly keepAwake: boolean;
  readonly pedalMode: PedalMode;
  readonly tunerMode: TunerMode;
  readonly drumLugs: number;
}

export const REFERENCE_PITCH_RANGE = { min: 430, max: 450 } as const;
export const TOLERANCE_OPTIONS = [3, 5, 10] as const;

export const DEFAULT_SETTINGS: Settings = {
  referencePitch: 442,
  tolerance: 5,
  clef: 'bass',
  accidentals: 'flats',
  clickSound: 'click',
  accentVolume: 1,
  beatVolume: 0.8,
  subdivisionVolume: 0.5,
  visualFlash: true,
  vibration: true,
  keepAwake: true,
  pedalMode: 'tapAndStartStop',
  tunerMode: 'chromatic',
  drumLugs: 8,
};

export const PEDAL_MODES: readonly { value: PedalMode; label: string }[] = [
  { value: 'tapAndStartStop', label: 'Tap · Start/Stop' },
  { value: 'previousAndNext', label: 'Previous · Next piece' },
];

/** Every setting, saved the moment it changes. The settings sheet edits `settings` through a signal form. */
@Service()
export class SettingsStore {
  readonly settings = persistedSignal('settings', DEFAULT_SETTINGS, withDefaults(DEFAULT_SETTINGS));

  readonly referencePitch = computed(() => this.settings().referencePitch);
  readonly tolerance = computed(() => this.settings().tolerance);

  update(changes: Partial<Settings>): void {
    this.settings.update((current) => ({ ...current, ...changes }));
  }
}
