import { Component, computed, inject } from '@angular/core';
import { SWING_RANGE } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';

/** Swing for eighths and sixteenths. The labels sit at the ends they describe: straight left, full swing right. */
@Component({
  selector: 'app-swing-slider',
  template: `
    <span aria-hidden="true" [class]="isStraight() ? 'font-semibold text-fg' : 'text-muted'"
      >Straight</span
    >
    <input
      type="range"
      class="h-11 min-w-0 flex-1 accent-accent"
      aria-label="Swing"
      step="0.01"
      [min]="range.min"
      [max]="range.max"
      [value]="store.swing()"
      [attr.aria-valuetext]="valueText()"
      (input)="store.setSwing(+$any($event.target).value)"
    />
    <span aria-hidden="true" [class]="isStraight() ? 'text-muted' : 'font-semibold text-fg'"
      >Swing</span
    >
  `,
  host: { class: 'flex min-h-11 items-center gap-3 text-[15px]' },
})
export class SwingSlider {
  protected readonly store = inject(MetronomeStore);
  protected readonly range = SWING_RANGE;
  protected readonly isStraight = computed(() => this.store.swing() < 0.51);

  protected readonly valueText = computed(() => {
    const swing = this.store.swing();
    if (swing < 0.51) return 'Straight';
    if (swing >= 0.655 && swing <= 0.68) return 'Triplet';
    return `${Math.round(swing * 100)} %`;
  });
}
