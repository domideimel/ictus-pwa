import { Component, computed, effect, inject, linkedSignal, untracked } from '@angular/core';
import { FormField, form, max, min } from '@angular/forms/signals';
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
  imports: [NumberStepper, Surface, FormField],
  host: { class: 'flex flex-col gap-5' },
  template: `
    <div class="flex items-center justify-between text-[15px]">
      <span id="lug-count-label">Lugs</span>
      <app-number-stepper label="Lugs" [formField]="lugForm.drumLugs" />
    </div>

    <div class="relative mx-auto aspect-square w-full max-w-[340px]">
      <div class="absolute rounded-full bg-paper" [style.inset.px]="lugSize() / 2 + 6"></div>
      <div
        class="absolute rounded-full border-[6px] border-stroke"
        [style.inset.px]="lugSize() / 2 - 3"
      ></div>
      <div
        class="absolute inset-0 flex flex-col items-center justify-center text-ink"
        aria-live="polite"
      >
        @if (reference(); as reference) {
          <span class="text-[22px] font-semibold tabular">{{ reference.toFixed(1) }} Hz</span>
          <span class="text-xs uppercase text-paper-label">{{
            tuning().target === null ? 'average' : 'target'
          }}</span>
        } @else {
          <span class="text-[22px] font-semibold">Lug {{ tuning().currentLug + 1 }}</span>
        }
      </div>
      @for (lug of lugs(); track lug.index) {
        <button
          type="button"
          class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface font-bold tabular"
          [class]="lug.classes"
          [style.left.%]="lug.left"
          [style.top.%]="lug.top"
          [style.width.px]="lugSize()"
          [style.height.px]="lugSize()"
          [attr.aria-label]="lug.description"
          [attr.aria-pressed]="lug.current"
          (click)="selectLug(lug.index)"
        >
          {{ lug.label }}
        </button>
      }
    </div>

    <div class="flex items-center justify-between gap-3 text-[15px]">
      <label for="drum-target">Compare with</label>
      <select
        id="drum-target"
        class="h-11 max-w-[60%] rounded-[10px] border border-stroke bg-surface px-3 text-muted"
        [value]="targetValue()"
        (change)="setTarget($any($event.target).value)"
      >
        <option value="average">Average of all lugs</option>
        @if (averageReference(); as average) {
          <option value="lock">Lock current average ({{ average.toFixed(1) }} Hz)</option>
        }
        @if (customTarget(); as custom) {
          <option value="custom">{{ custom }}</option>
        }
        <optgroup label="Note">
          @for (note of targetNotes(); track note.midi) {
            <option [value]="note.midi">{{ note.label }}</option>
          }
        </optgroup>
      </select>
    </div>

    <div class="flex flex-col gap-1.5 text-[15px] tabular" aria-live="polite">
      @if (advice(); as advice) {
        @switch (advice.kind) {
          @case ('empty') {
            <p class="text-muted">
              Tap in front of lug {{ tuning().currentLug + 1 }}. Each strike is stored and the next
              lug lights up.
            </p>
          }
          @case ('good') {
            <p class="font-semibold text-in-tune">
              ✓ All measured lugs within ±{{ settings.tolerance() }} ¢
            </p>
          }
          @case ('fix') {
            @for (line of advice.lines; track line) {
              <p class="text-accent-text">{{ line }}</p>
            }
          }
        }
      }
      @if (spread(); as spread) {
        <p class="text-muted">Spread {{ spread }} ¢</p>
      }
    </div>

    <button
      type="button"
      appSurface
      class="h-12 rounded-xl text-[15px] font-semibold"
      (click)="clear()"
    >
      Clear
    </button>
  `,
})
export class DrumTuning {
  private readonly tuner = inject(TunerStore);
  protected readonly settings = inject(SettingsStore);

  protected readonly lugForm = form(this.settings.settings, (path) => {
    min(path.drumLugs, LUG_RANGE.min);
    max(path.drumLugs, LUG_RANGE.max);
  });

  /** Readings start over whenever the lug count changes; the target is kept. */
  protected readonly tuning = linkedSignal<number, ReturnType<typeof emptyTuning>>({
    source: () => this.settings.settings().drumLugs,
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
      const ring = current ? 'border-[3px] border-accent' : 'border-[1.5px] border-ring';
      const tint =
        value === null
          ? 'text-fg text-[17px]'
          : inTune
            ? 'bg-in-tune/25 text-in-tune text-[13px]'
            : 'bg-accent/20 text-accent-text text-[13px]';
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
    const style = this.settings.settings().accidentals;
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
      untracked(() => this.tuning.update((tuning) => recordStrike(tuning, frequency)));
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
