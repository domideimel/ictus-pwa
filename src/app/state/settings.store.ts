import {
  getState,
  patchState,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { ClickSound } from '../audio/click-synth';
import { AccidentalStyle } from '../music/note';
import { ClefSetting } from '../music/staff';
import { withDefaults, withPersistence, writableState } from './storage';

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
  readonly polyVolume: number;
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
  polyVolume: 0.9,
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

/**
 * Every setting, each exposed as a signal and saved the moment it changes.
 * Signal forms edit the settings through `editable`.
 */
export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState<Settings>(DEFAULT_SETTINGS),
  withPersistence<Settings>('settings', withDefaults(DEFAULT_SETTINGS)),
  withMethods((store) => ({
    update(changes: Partial<Settings>): void {
      patchState(store, changes);
    },
  })),
  withProps((store) => ({
    editable: writableState<Settings>(
      () => getState(store),
      (settings) => store.update(settings),
    ),
  })),
);
