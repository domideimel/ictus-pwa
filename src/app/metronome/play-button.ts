import { Component, inject, input } from '@angular/core';
import { LgButton } from '@domideimel/ng-liquid-glass/button';
import { MetronomeStore } from '../state/metronome.store';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-play-button',
  imports: [Icon, LgButton],
  templateUrl: './play-button.html',
})
export class PlayButton {
  protected readonly store = inject(MetronomeStore);
  readonly size = input(96);
}
