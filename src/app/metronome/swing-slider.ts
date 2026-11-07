import { Component, computed, inject } from '@angular/core';
import { SWING_RANGE } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';

/** Swing for eighths and sixteenths. The labels sit at the ends they describe: straight left, full swing right. */
@Component({
  selector: 'app-swing-slider',
  templateUrl: './swing-slider.html',
  host: { class: 'flex min-h-11 items-center gap-3 text-15' },
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
