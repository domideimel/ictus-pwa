import { Component, computed, inject, input } from '@angular/core';
import { accidentalSymbol, spell } from '../music/note';
import { SettingsStore } from '../state/settings.store';
import { TunerStore } from '../state/tuner.store';

/** Large note letter (German names) with accidental and a smaller octave number. */
@Component({
  selector: 'app-note-name',
  templateUrl: './note-name.html',
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
  templateUrl: './tuning-state-pill.html',
  host: {
    class:
      'inline-flex h-9 items-center self-center rounded-full px-4 text-base font-bold tabular-nums',
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
  templateUrl: './cents-meter.html',
  host: { class: 'block w-full max-w-120' },
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
  templateUrl: './frequency-label.html',
  host: { class: 'block min-h-5 text-sm text-muted tabular-nums' },
})
export class FrequencyLabel {
  protected readonly tuner = inject(TunerStore);
}
