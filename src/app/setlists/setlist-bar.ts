import { Component, inject, output } from '@angular/core';
import { LibraryStore } from '../state/library.store';
import { MetronomeStore } from '../state/metronome.store';
import { Icon } from '../ui/icon';

/** Shows the loaded piece with previous / next buttons for stepping through a setlist on stage. */
@Component({
  selector: 'app-setlist-bar',
  imports: [Icon],
  templateUrl: './setlist-bar.html',
})
export class SetlistBar {
  protected readonly library = inject(LibraryStore);
  private readonly metronome = inject(MetronomeStore);
  readonly open = output();

  protected step(offset: number): void {
    const piece = this.library.step(offset);
    if (piece) this.metronome.apply(piece);
  }
}
