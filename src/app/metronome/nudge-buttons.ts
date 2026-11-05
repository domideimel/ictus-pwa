import { Component, inject, input } from '@angular/core';
import { MetronomeStore } from '../state/metronome.store';
import { HoldRepeat } from '../ui/hold-repeat';
import { Surface } from '../ui/surface';

/** −5 −1 +1 +5; hold to keep changing. */
@Component({
  selector: 'app-nudge-buttons',
  imports: [HoldRepeat, Surface],
  host: { class: 'grid grid-cols-4 gap-2' },
  template: `
    @for (delta of deltas; track delta) {
      <button
        type="button"
        appSurface
        appHoldRepeat
        class="rounded-xl text-base tabular"
        [style.height.px]="height()"
        [attr.aria-label]="(delta > 0 ? 'Plus ' : 'Minus ') + abs(delta) + ' BPM'"
        (repeat)="store.nudge(delta)"
      >
        {{ delta > 0 ? '+' + delta : '−' + abs(delta) }}
      </button>
    }
  `,
})
export class NudgeButtons {
  protected readonly store = inject(MetronomeStore);
  readonly height = input(44);
  protected readonly deltas = [-5, -1, 1, 5];
  protected readonly abs = Math.abs;
}
