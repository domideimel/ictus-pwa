import { Component, computed, effect, inject, linkedSignal, untracked } from '@angular/core';
import {
  LUG_RANGE,
  deviations,
  emptyTuning,
  recordStrike,
  referencePitch,
  spread,
} from '../music/drum-tuning';
import { midiFrequency, readNote, spell } from '../music/note';
import { SettingsStore } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';
import { NumberStepper } from '../ui/number-stepper';
import { Surface } from '../ui/surface';

/** Tap the head about 2–3 cm in front of each lug; every strike is stored for the highlighted lug. */
@Component({
  selector: 'app-drum-tuning',
  imports: [NumberStepper, Surface],
  templateUrl: './drum-tuning.html',
  host: { class: 'flex flex-col gap-5' },
})
export class DrumTuning {
  private readonly tuner = inject(TunerStore);
  protected readonly settings = inject(SettingsStore);

  protected readonly lugRange = LUG_RANGE;

  /** Readings start over whenever the lug count changes; the target is kept. */
  protected readonly tuning = linkedSignal<number, ReturnType<typeof emptyTuning>>({
    source: () => this.settings.drumLugs(),
    computation: (lugCount, previous) => emptyTuning(lugCount, previous?.value.target ?? null),
  });

  protected readonly lugSize = computed(() => (this.tuning().readings.length > 10 ? 44 : 52));
  protected readonly reference = computed(() => referencePitch(this.tuning()));
  protected readonly averageReference = computed(() =>
    this.tuning().target === null ? this.reference() : null,
  );
  protected readonly spread = computed(() => {
    const value = spread(this.tuning());
    return value === null ? null : Math.round(value);
  });

  protected readonly lugs = computed(() => {
    const tuning = this.tuning();
    const cents = deviations(tuning);
    const tolerance = this.settings.tolerance();
    const count = tuning.readings.length;
    // Lug centres sit on a circle that just fits the buttons inside the square.
    const radius = 50 - (this.lugSize() / 2 / 340) * 100;
    return cents.map((value, index) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
      const current = tuning.currentLug === index;
      const inTune = value !== null && Math.abs(value) <= tolerance;
      const rounded = value === null ? 0 : Math.round(value);
      const ring = current ? 'border-3 border-accent' : 'border-[1.5px] border-ring';
      const tint =
        value === null
          ? 'text-fg text-17'
          : inTune
            ? 'bg-in-tune/25 text-in-tune text-13'
            : 'bg-accent/20 text-accent-text text-13';
      return {
        index,
        current,
        left: 50 + radius * Math.cos(angle),
        top: 50 + radius * Math.sin(angle),
        classes: `${ring} ${tint}`,
        label:
          value === null
            ? String(index + 1)
            : inTune
              ? '✓'
              : rounded > 0
                ? `▲${rounded}`
                : `▼${-rounded}`,
        description:
          value === null ? `Lug ${index + 1}, not measured` : `Lug ${index + 1}, ${rounded} cents`,
      };
    });
  });

  protected readonly advice = computed(() => {
    const cents = deviations(this.tuning());
    if (cents.every((value) => value === null)) return { kind: 'empty' as const };
    const tolerance = this.settings.tolerance();
    const lines = cents.flatMap((value, index) => {
      if (value === null || Math.abs(value) <= tolerance) return [];
      const rounded = Math.round(value);
      return [
        rounded > 0
          ? `Lug ${index + 1}: ▲ ${rounded} ¢ high, loosen`
          : `Lug ${index + 1}: ▼ ${-rounded} ¢ low, tighten`,
      ];
    });
    return lines.length === 0 ? { kind: 'good' as const } : { kind: 'fix' as const, lines };
  });

  protected readonly targetNotes = computed(() => {
    const reference = this.settings.referencePitch();
    const style = this.settings.accidentals();
    return Array.from({ length: 37 }, (_, i) => 72 - i).map((midi) => {
      const spelling = spell(midi, style);
      return {
        midi,
        label: `${spelling.name}${spelling.octave} · ${midiFrequency(midi, reference).toFixed(1)} Hz`,
      };
    });
  });

  /** A target that is not exactly a note of the list (a locked average). */
  protected readonly customTarget = computed(() => {
    const target = this.tuning().target;
    if (target === null) return null;
    const reading = readNote(target, this.settings.referencePitch());
    return Math.abs(reading.cents) < 1 ? null : `Locked ${target.toFixed(1)} Hz`;
  });

  protected readonly targetValue = computed(() => {
    const target = this.tuning().target;
    if (target === null) return 'average';
    if (this.customTarget()) return 'custom';
    return String(readNote(target, this.settings.referencePitch()).midi);
  });

  constructor() {
    let lastStrike = untracked(this.tuner.strikeCount);
    effect(() => {
      const count = this.tuner.strikeCount();
      const frequency = this.tuner.strikeFrequency();
      if (count === lastStrike || frequency === null) return;
      lastStrike = count;
      untracked(() => {
        this.tuning.update((tuning) => recordStrike(tuning, frequency));
      });
    });
  }

  protected selectLug(index: number): void {
    this.tuning.update((tuning) => ({ ...tuning, currentLug: index }));
  }

  protected setTarget(value: string): void {
    if (value === 'custom') return;
    const target =
      value === 'average'
        ? null
        : value === 'lock'
          ? this.reference()
          : midiFrequency(Number(value), this.settings.referencePitch());
    this.tuning.update((tuning) => ({ ...tuning, target }));
  }

  protected clear(): void {
    this.tuning.update((tuning) => emptyTuning(tuning.readings.length, tuning.target));
  }
}
