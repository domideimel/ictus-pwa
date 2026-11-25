import { Component, inject, input } from '@angular/core';
import { LgButton } from '@domideimel/ng-liquid-glass/button';
import { MetronomeStore } from '../state/metronome.store';
import { HoldRepeat } from '../ui/hold-repeat';

/** −5 −1 +1 +5; hold to keep changing. */
@Component({
  selector: 'app-nudge-buttons',
  imports: [HoldRepeat, LgButton],
  templateUrl: './nudge-buttons.html',
  host: { class: 'grid grid-cols-4 gap-2' },
})
export class NudgeButtons {
  protected readonly store = inject(MetronomeStore);
  readonly height = input(44);
  protected readonly deltas = [-5, -1, 1, 5];
  protected readonly abs = Math.abs;
}
