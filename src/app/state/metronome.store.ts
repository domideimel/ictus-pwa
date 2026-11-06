import { DestroyRef, computed, inject, signal, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import type { ClickParams, ScheduledBeat } from '../audio/click-scheduler';
import { setAudioSession } from '../audio/audio-context';
import { MetronomeEngine } from '../audio/metronome-engine';
import type { Pulse, Subdivision, TimeSignature } from '../music/meter';
import {
  BPM_RANGE,
  BeatLevel,
  SWING_RANGE,
  beatLengths,
  canCountInGroups,
  clamp,
  defaultGrouping,
  defaultLevels,
  groupStarts,
  isValidSignature,
  keepNoteValue,
  nextLevel,
  sameSignature,
  subdivisionInfo,
  subdivisionOptions,
  tempoMarking,
  tempoUnits,
} from '../music/meter';
import type { GapClick, Polyrhythm, RestCounter, SpeedTrainer } from '../music/practice';
import {
  DEFAULT_GAP_CLICK,
  DEFAULT_SPEED_TRAINER,
  isGapBar,
  trainerTempo,
} from '../music/practice';
import { SettingsStore } from './settings.store';
import type { Parser } from './storage';
import { withDefaults, withPersistence, writableState } from './storage';

/** What a saved piece stores, and what the metronome screen edits. */
export interface MetronomeSetup {
  readonly bpm: number;
  readonly timeSignature: TimeSignature;
  readonly grouping: readonly number[];
  /** Count every note of the meter, or every group of the grouping. */
  readonly pulse: Pulse;
  /** One per count, so one per group when counting in groups. */
  readonly levels: readonly BeatLevel[];
  readonly subdivision: Subdivision;
  readonly swing: number;
}

/** Practice tools behind the dumbbell button; edited by the practice sheet's signal form. */
export interface PracticeSetup {
  readonly gapClick: GapClick;
  readonly speedTrainer: SpeedTrainer;
  readonly polyrhythm: Polyrhythm;
  readonly restBars: number;
  readonly restAudible: boolean;
}

const DEFAULT_SETUP: MetronomeSetup = {
  bpm: 120,
  timeSignature: { beats: 4, unit: 4 },
  grouping: [4],
  pulse: 'unit',
  levels: defaultLevels(4),
  subdivision: 1,
  swing: 0.5,
};

/** The practice tools that change the click; the rest counter is a one-off and not one of them. */
export type PracticeTool = 'gapClick' | 'polyrhythm' | 'speedTrainer';

export const DEFAULT_PRACTICE: PracticeSetup = {
  gapClick: DEFAULT_GAP_CLICK,
  speedTrainer: DEFAULT_SPEED_TRAINER,
  polyrhythm: 'off',
  restBars: 8,
  restAudible: false,
};

const isBeatLevel = (level: unknown): level is BeatLevel =>
  level === BeatLevel.Normal || level === BeatLevel.Accent || level === BeatLevel.Mute;

/** Fixes anything that no longer fits together, e.g. a grouping saved for another meter. */
export function sanitizeSetup(setup: MetronomeSetup): MetronomeSetup {
  const timeSignature = isValidSignature(setup.timeSignature)
    ? setup.timeSignature
    : DEFAULT_SETUP.timeSignature;
  const grouping =
    setup.grouping.reduce((sum, size) => sum + size, 0) === timeSignature.beats
      ? setup.grouping
      : defaultGrouping(timeSignature);
  const pulse: Pulse =
    setup.pulse === 'group' && canCountInGroups(timeSignature, grouping) ? 'group' : 'unit';
  const lengths = beatLengths(timeSignature, grouping, pulse);
  const levels =
    setup.levels.length === lengths.length && setup.levels.every(isBeatLevel)
      ? setup.levels
      : defaultLevels(lengths.length);
  return {
    bpm: clamp(Math.round(setup.bpm) || DEFAULT_SETUP.bpm, BPM_RANGE.min, BPM_RANGE.max),
    timeSignature,
    grouping,
    pulse,
    levels,
    subdivision: subdivisionInfo(setup.subdivision, timeSignature.unit, lengths).value,
    swing: clamp(setup.swing, SWING_RANGE.min, SWING_RANGE.max),
  };
}

/** Reads a saved setup, filling in missing fields and repairing what no longer fits together. */
export const parseSetup: Parser<MetronomeSetup> = (value) => {
  const merged = withDefaults(DEFAULT_SETUP)(value);
  return merged ? sanitizeSetup(merged) : null;
};

interface MetronomeState {
  readonly setup: MetronomeSetup;
  readonly practice: PracticeSetup;
}

const parseState: Parser<MetronomeState> = (value) => {
  if (typeof value !== 'object' || value === null) return null;
  const stored = value as Partial<Record<keyof MetronomeState, unknown>>;
  return {
    setup: parseSetup(stored.setup) ?? DEFAULT_SETUP,
    practice: withDefaults(DEFAULT_PRACTICE)(stored.practice) ?? DEFAULT_PRACTICE,
  };
};

/**
 * Setup and practice tools are saved; playback state lives in private signals so the click doesn't
 * write to storage on every beat. Signal forms edit the practice tools through `editablePractice`.
 */
export const MetronomeStore = signalStore(
  { providedIn: 'root' },
  withState<MetronomeState>({ setup: DEFAULT_SETUP, practice: DEFAULT_PRACTICE }),
  withPersistence<MetronomeState>('metronome', parseState),
  withProps(() => ({
    _settings: inject(SettingsStore),
    _playing: signal(false),
    _beat: signal<number | null>(null),
    _bar: signal(0),
    _rest: signal<RestCounter | null>(null),
  })),
  withComputed(({ setup, practice, _settings, _playing, _beat, _bar, _rest }) => {
    const bpm = computed(() => setup().bpm);
    const levels = computed(() => setup().levels);
    const grouping = computed(() => setup().grouping);
    const timeSignature = computed(() => setup().timeSignature);
    const memberBeatLengths = computed(() =>
      beatLengths(timeSignature(), grouping(), setup().pulse),
    );
    const countsInGroups = computed(() => memberBeatLengths().some((length) => length > 1));
    /** Counting in groups, every count starts a group, so only the downbeat stands out. */
    const memberGroupStarts = computed(() =>
      countsInGroups() ? new Set<number>() : groupStarts(grouping()),
    );
    const subdivision = computed(() => setup().subdivision);
    return {
      bpm,
      timeSignature,
      grouping,
      pulse: computed(() => setup().pulse),
      levels,
      beatLengths: memberBeatLengths,
      countsInGroups,
      /** Notes of the time signature the BPM counts. */
      tempoUnits: computed(() => tempoUnits(memberBeatLengths())),
      subdivision,
      subdivisionOptions: computed(() =>
        subdivisionOptions(timeSignature().unit, memberBeatLengths()),
      ),
      subdivisionInfo: computed(() =>
        subdivisionInfo(subdivision(), timeSignature().unit, memberBeatLengths()),
      ),
      swing: computed(() => setup().swing),
      groupStarts: memberGroupStarts,
      tempoMarking: computed(() => tempoMarking(bpm())),

      isPlaying: _playing.asReadonly(),
      /** Beat currently sounding, reported once it is audible so the light matches what you hear. */
      currentBeat: _beat.asReadonly(),
      /** Bars completed since start (0 during the first bar). */
      currentBar: _bar.asReadonly(),
      rest: _rest.asReadonly(),

      /** Tempo of the bar that is playing, with the speed trainer applied. */
      currentTempo: computed(() => {
        const trainer = practice().speedTrainer;
        if (!_playing() || _rest() || !trainer.enabled) return bpm();
        return Math.round(trainerTempo(bpm(), _bar(), trainer));
      }),

      /** True while the current bar is a muted bar of the gap click. */
      /** Practice tools that are switched on, in the order the practice sheet lists them. */
      activePractice: computed(() => {
        const { gapClick, polyrhythm, speedTrainer } = practice();
        const tools: PracticeTool[] = [];
        if (gapClick.enabled) tools.push('gapClick');
        if (polyrhythm !== 'off') tools.push('polyrhythm');
        if (speedTrainer.enabled) tools.push('speedTrainer');
        return tools;
      }),

      isInGap: computed(() => _playing() && !_rest() && isGapBar(practice().gapClick, _bar())),

      /** Practice tools are paused while the rest counter runs. */
      _clickParams: computed<ClickParams>(() => {
        const current = setup();
        const tools = practice();
        const rest = _rest();
        return {
          bpm: current.bpm,
          levels: current.levels,
          beatLengths: memberBeatLengths(),
          tempoUnits: tempoUnits(memberBeatLengths()),
          groupStarts: memberGroupStarts(),
          subdivision: current.subdivision,
          swing: current.swing,
          gap: rest ? DEFAULT_GAP_CLICK : tools.gapClick,
          trainer: rest ? DEFAULT_SPEED_TRAINER : tools.speedTrainer,
          polyrhythm: rest ? 'off' : tools.polyrhythm,
          silent: rest !== null && !rest.audible,
          accentVolume: _settings.accentVolume(),
          beatVolume: _settings.beatVolume(),
          subdivisionVolume: _settings.subdivisionVolume(),
          polyVolume: _settings.polyVolume(),
        };
      }),
    };
  }),
  withProps((store) => ({
    editablePractice: writableState(store.practice, (practice) => {
      patchState(store, { practice });
    }),
  })),
  withMethods((store) => {
    const patch = (changes: Partial<MetronomeSetup>): void => {
      patchState(store, ({ setup }) => ({ setup: { ...setup, ...changes } }));
    };

    /**
     * Changes how the bar is counted. Accents reset when the number of counts changes, and the BPM is
     * converted so the notes keep their speed: 6/8 at ♪ = 180 becomes ♩. = 60.
     */
    const recount = (grouping: readonly number[], pulse: Pulse): void => {
      const current = store.setup();
      const before = beatLengths(current.timeSignature, current.grouping, current.pulse);
      const after = beatLengths(current.timeSignature, grouping, pulse);
      const sameCounts = before.join('+') === after.join('+');
      patchState(store, {
        setup: sanitizeSetup({
          ...current,
          grouping,
          pulse,
          levels: sameCounts ? current.levels : defaultLevels(after.length),
          bpm: (current.bpm * tempoUnits(before)) / tempoUnits(after),
        }),
      });
    };

    const setBpm = (bpm: number): void => {
      patch({ bpm: clamp(Math.round(bpm), BPM_RANGE.min, BPM_RANGE.max) });
    };

    const stop = (): void => {
      if (!store._playing()) return;
      engine.stop();
      store._playing.set(false);
      store._beat.set(null);
    };

    const start = async (): Promise<void> => {
      if (store._playing()) return;
      setAudioSession('playback');
      store._playing.set(true);
      store._bar.set(0);
      try {
        await engine.start();
        // Stopped again while the audio context was resuming.
        if (!store._playing()) engine.stop();
      } catch (error) {
        console.error('Metronome start failed', error);
        store._playing.set(false);
      }
    };

    /** The downbeat after the last rest bar is the entrance: stop and signal it. */
    const finishRest = (rest: RestCounter): void => {
      stop();
      store._rest.set({ ...rest, finished: true });
      vibrate([60, 40, 60]);
    };

    const showBeat = ({ index, bar }: ScheduledBeat): void => {
      const rest = store._rest();
      if (rest && !rest.finished && bar >= rest.bars) {
        finishRest(rest);
        return;
      }
      store._beat.set(index);
      store._bar.set(bar);
      const level = store.levels()[index] ?? BeatLevel.Normal;
      if (level === BeatLevel.Mute || store.isInGap()) return;
      if (store._settings.vibration()) {
        vibrate(index === 0 ? 35 : store.groupStarts().has(index) ? 20 : 12);
      }
    };

    const engine = new MetronomeEngine(
      () => untracked(store._clickParams),
      () => untracked(store._settings.clickSound),
      showBeat,
    );
    inject(DestroyRef).onDestroy(() => {
      engine.dispose();
    });

    let tapTimes: number[] = [];

    return {
      // MARK: Editing

      setBpm,

      nudge(delta: number): void {
        setBpm(store.bpm() + delta);
      },

      setTimeSignature(timeSignature: TimeSignature): void {
        if (!isValidSignature(timeSignature) || sameSignature(timeSignature, store.timeSignature()))
          return;
        patch({
          timeSignature,
          grouping: defaultGrouping(timeSignature),
          pulse: 'unit',
          levels: defaultLevels(timeSignature.beats),
          subdivision: keepNoteValue(
            store.subdivision(),
            store.timeSignature().unit,
            timeSignature.unit,
          ),
        });
      },

      setGrouping(grouping: readonly number[]): void {
        if (grouping.reduce((sum, size) => sum + size, 0) !== store.timeSignature().beats) return;
        recount(grouping, store.pulse());
      },

      setPulse(pulse: Pulse): void {
        if (pulse === store.pulse()) return;
        recount(store.grouping(), pulse);
      },

      cycleLevel(index: number): void {
        patch({
          levels: store.levels().map((level, i) => (i === index ? nextLevel(level) : level)),
        });
      },

      setSubdivision(subdivision: Subdivision): void {
        patch({ subdivision });
      },

      setSwing(swing: number): void {
        patch({ swing: clamp(swing, SWING_RANGE.min, SWING_RANGE.max) });
      },

      /** Loads a saved piece; while playing, the change takes effect on the next click. */
      apply(setup: MetronomeSetup): void {
        patchState(store, { setup: sanitizeSetup(setup) });
      },

      /** Tap tempo: average interval of the last four taps; a pause over two seconds starts over. */
      tap(now = performance.now()): void {
        const last = tapTimes.at(-1);
        if (last !== undefined && now - last > 2000) tapTimes = [];
        tapTimes = [...tapTimes, now].slice(-5);
        const first = tapTimes[0];
        if (tapTimes.length < 2 || first === undefined) return;
        const average = (now - first) / (tapTimes.length - 1);
        setBpm(60000 / average);
      },

      // MARK: Transport

      toggle(): void {
        if (store._playing()) stop();
        else void start();
      },

      start,
      stop,

      // MARK: Rest counter

      /** Counts `bars` bars at the current tempo and meter, silently unless `audible`, then stops on the entrance. */
      startRest(bars: number, audible: boolean): void {
        stop();
        store._rest.set({ bars: Math.max(1, bars), audible, finished: false });
        void start();
      },

      /** Switches one practice tool off, or all of them; their settings are kept for next time. */
      turnOffPractice(tool?: PracticeTool): void {
        patchState(store, ({ practice }) => ({
          practice: {
            ...practice,
            gapClick:
              !tool || tool === 'gapClick'
                ? { ...practice.gapClick, enabled: false }
                : practice.gapClick,
            polyrhythm: !tool || tool === 'polyrhythm' ? 'off' : practice.polyrhythm,
            speedTrainer:
              !tool || tool === 'speedTrainer'
                ? { ...practice.speedTrainer, enabled: false }
                : practice.speedTrainer,
          },
        }));
      },

      endRest(): void {
        stop();
        store._rest.set(null);
      },
    };
  }),
);

/** Android buzzes; iOS Safari has no vibration API, so this is a no-op there. */
function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}
