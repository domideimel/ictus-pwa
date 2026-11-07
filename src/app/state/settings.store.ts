import {
  getState,
  patchState,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import type { ClickSound } from '../audio/click-synth';
import { CLICK_SOUNDS } from '../audio/click-synth';
import { LUG_RANGE } from '../music/drum-tuning';
import type { AccidentalStyle } from '../music/note';
import { ACCIDENTAL_STYLES } from '../music/note';
import type { ClefSetting } from '../music/staff';
import { CLEF_SETTINGS } from '../music/staff';
import { clamp, wholeIn } from '../shared/numbers';
import type { Parser } from './storage';
import { oneOf, withDefaults, withPersistence, writableState } from './storage';

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

export const TUNER_MODES: readonly TunerMode[] = ['chromatic', 'drum'];

const volume = (value: number): number => clamp(value, 0, 1);

/** Reads saved settings; a value outside its range or an option this version doesn't know gets the default. */
export const parseSettings: Parser<Settings> = (value) => {
  const merged = withDefaults(DEFAULT_SETTINGS)(value);
  if (!merged) return null;
  const d = DEFAULT_SETTINGS;
  return {
    referencePitch: wholeIn(merged.referencePitch, REFERENCE_PITCH_RANGE),
    tolerance: oneOf<number>(TOLERANCE_OPTIONS, merged.tolerance, d.tolerance),
    clef: oneOf(CLEF_SETTINGS, merged.clef, d.clef),
    accidentals: oneOf(ACCIDENTAL_STYLES, merged.accidentals, d.accidentals),
    clickSound: oneOf(
      CLICK_SOUNDS.map((sound) => sound.value),
      merged.clickSound,
      d.clickSound,
    ),
    accentVolume: volume(merged.accentVolume),
    beatVolume: volume(merged.beatVolume),
    subdivisionVolume: volume(merged.subdivisionVolume),
    polyVolume: volume(merged.polyVolume),
    vibration: merged.vibration,
    keepAwake: merged.keepAwake,
    pedalMode: oneOf(
      PEDAL_MODES.map((mode) => mode.value),
      merged.pedalMode,
      d.pedalMode,
    ),
    tunerMode: oneOf(TUNER_MODES, merged.tunerMode, d.tunerMode),
    drumLugs: wholeIn(merged.drumLugs, LUG_RANGE),
  };
};

/**
 * Every setting, each exposed as a signal and saved the moment it changes.
 * Signal forms edit the settings through `editable`.
 */
export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState<Settings>(DEFAULT_SETTINGS),
  withPersistence<Settings>('settings', parseSettings),
  withMethods((store) => ({
    update(changes: Partial<Settings>): void {
      patchState(store, changes);
    },
  })),
  withProps((store) => ({
    editable: writableState<Settings>(
      () => getState(store),
      (settings) => {
        store.update(settings);
      },
    ),
  })),
);
