import { Component, computed, inject, input } from '@angular/core';
import { accidentalSymbol, spell } from '../music/note';
import { SettingsStore } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';

/** Large note letter (German names) with accidental and a smaller octave number. */
@Component({
  selector: 'app-note-name',
  template: `
    @if (spelling(); as spelling) {
      <span class="font-semibold tracking-[-0.04em]" [style.font-size.px]="size()">{{
        spelling.letterName
      }}</span>
      @if (spelling.nameAccidental !== 'natural') {
        <span
          class="font-medium"
          [style.font-size.px]="size() * 0.45"
          [style.margin-top.px]="size() * 0.08"
        >
          {{ symbol(spelling.nameAccidental) }}
        </span>
      }
      <span
        class="ms-1 font-medium text-muted"
        [style.font-size.px]="size() * 0.31"
        [style.margin-top.px]="size() * 0.59"
      >
        {{ spelling.octave }}
      </span>
    } @else {
      <span class="font-semibold text-stroke" [style.font-size.px]="size()">–</span>
    }
  `,
  host: {
    class: 'flex items-start leading-none',
    role: 'img',
    '[style.height.px]': 'size()',
    '[attr.aria-label]': 'label()',
  },
})
export class NoteName {
  private readonly tuner = inject(TunerStore);
  private readonly settings = inject(SettingsStore);
  readonly size = input(128);

  protected readonly symbol = accidentalSymbol;
  protected readonly spelling = computed(() => {
    const reading = this.tuner.reading();
    return reading ? spell(reading.midi, this.settings.accidentals()) : null;
  });
  protected readonly label = computed(() => {
    const spelling = this.spelling();
    return spelling ? `${spelling.name} ${spelling.octave}` : 'No note';
  });
}

/** High / in tune / low, with symbol and text so it never relies on colour alone. */
@Component({
  selector: 'app-tuning-state-pill',
  template: '{{ state().text }}',
  host: {
    class: 'inline-flex h-9 items-center self-center rounded-full px-4 text-base font-bold tabular',
    role: 'status',
    '[class]': 'state().classes',
  },
})
export class TuningStatePill {
  private readonly tuner = inject(TunerStore);

  protected readonly state = computed(() => {
    const neutral = 'bg-muted/15 text-muted';
    if (this.tuner.microphoneDenied())
      return { text: 'Microphone access needed', classes: neutral };
    if (this.tuner.isPausedForClick())
      return { text: 'Paused while the click plays', classes: neutral };
    const reading = this.tuner.reading();
    if (!reading)
      return { text: this.tuner.isListening() ? 'Listening…' : 'Tuner off', classes: neutral };
    const cents = Math.round(reading.cents);
    const signed = cents > 0 ? `+${cents}` : cents < 0 ? `−${-cents}` : '0';
    if (this.tuner.isInTune())
      return { text: `✓ In tune · ${signed} ¢`, classes: 'bg-in-tune/15 text-in-tune' };
    const direction = reading.cents > 0 ? '▲ High' : '▼ Low';
    return { text: `${direction} · ${signed} ¢`, classes: 'bg-accent/15 text-accent-text' };
  });
}

/** Needle from −50 to +50 cents with the in-tune band shaded. */
@Component({
  selector: 'app-cents-meter',
  template: `
    <svg viewBox="0 0 480 96" class="w-full" role="img" [attr.aria-label]="label()">
      <rect
        y="14"
        height="44"
        rx="6"
        class="fill-in-tune"
        fill-opacity="0.22"
        [attr.x]="x(-tolerance())"
        [attr.width]="x(tolerance()) - x(-tolerance())"
      />
      <g class="stroke-ring" stroke-width="1.5">
        @for (tick of ticks; track tick) {
          @let major = tick === -50 || tick === 50;
          <line
            [attr.x1]="x(tick)"
            [attr.x2]="x(tick)"
            [attr.y1]="major ? 30 : 34"
            [attr.y2]="major ? 44 : 40"
          />
        }
      </g>
      <line x1="20" y1="37" x2="460" y2="37" class="stroke-stroke" stroke-width="1.5" />
      <line x1="240" y1="18" x2="240" y2="54" class="stroke-in-tune" stroke-width="2.5" />
      @if (needle(); as needle) {
        <g
          class="transition-transform duration-100 ease-out motion-reduce:transition-none"
          [style.transform]="'translateX(' + needle.x + 'px)'"
        >
          <line
            x1="0"
            y1="9"
            x2="0"
            y2="65"
            stroke-width="4"
            stroke-linecap="round"
            [class]="needle.inTune ? 'stroke-in-tune' : 'stroke-accent'"
          />
          <circle cx="0" cy="37" r="7" [class]="needle.inTune ? 'fill-in-tune' : 'fill-accent'" />
        </g>
      }
      <g font-size="12" text-anchor="middle" class="fill-muted">
        <text x="20" y="84">−50</text>
        <text x="130" y="84">▼ low</text>
        <text x="240" y="84" class="fill-in-tune">0</text>
        <text x="350" y="84">high ▲</text>
        <text x="460" y="84">+50</text>
      </g>
    </svg>
  `,
  host: { class: 'block w-full max-w-[480px]' },
})
export class CentsMeter {
  private readonly tuner = inject(TunerStore);
  private readonly settings = inject(SettingsStore);

  protected readonly ticks = [-50, -40, -30, -20, -10, 10, 20, 30, 40, 50];
  protected readonly tolerance = this.settings.tolerance;
  protected readonly x = (cents: number): number => 20 + ((cents + 50) / 100) * 440;

  protected readonly needle = computed(() => {
    const reading = this.tuner.reading();
    if (!reading) return null;
    return { x: this.x(Math.min(Math.max(reading.cents, -50), 50)), inTune: this.tuner.isInTune() };
  });

  protected readonly label = computed(() => {
    const reading = this.tuner.reading();
    return reading ? `Cents meter: ${Math.round(reading.cents)} cents` : 'Cents meter: no reading';
  });
}

@Component({
  selector: 'app-frequency-label',
  template: `
    @if (tuner.reading(); as reading) {
      {{ reading.frequency.toFixed(2) }} Hz · target {{ reading.targetFrequency.toFixed(2) }} Hz
    }
  `,
  host: { class: 'block min-h-5 text-sm text-muted tabular' },
})
export class FrequencyLabel {
  protected readonly tuner = inject(TunerStore);
}
