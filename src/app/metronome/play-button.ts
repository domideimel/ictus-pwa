import { Component, inject, input } from '@angular/core';
import { MetronomeStore } from '../state/metronome.store';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-play-button',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="flex items-center justify-center rounded-full bg-accent text-on-accent transition-transform active:scale-95 motion-reduce:transition-none"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-label]="store.isPlaying() ? 'Stop metronome' : 'Start metronome'"
      (click)="store.toggle()"
    >
      <app-icon
        [name]="store.isPlaying() ? 'stop' : 'play'"
        [size]="size() * 0.38"
        [class.translate-x-[3%]]="!store.isPlaying()"
      />
    </button>
  `,
})
export class PlayButton {
  protected readonly store = inject(MetronomeStore);
  readonly size = input(96);
}
