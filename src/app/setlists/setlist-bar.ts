import { Component, inject, output } from '@angular/core';
import { LibraryStore } from '../state/library.store';
import { MetronomeStore } from '../state/metronome.store';
import { Icon } from '../ui/icon';

/** Shows the loaded piece with previous / next buttons for stepping through a setlist on stage. */
@Component({
  selector: 'app-setlist-bar',
  imports: [Icon],
  template: `
    @if (library.activePosition(); as position) {
      <div class="flex items-center gap-2 rounded-[14px] border border-stroke bg-surface p-1">
        <button
          type="button"
          class="flex size-11 items-center justify-center disabled:opacity-30"
          aria-label="Previous piece"
          [disabled]="position.index === 0"
          (click)="step(-1)"
        >
          <app-icon name="chevron-left" [size]="18" [strokeWidth]="2.2" />
        </button>
        <button
          type="button"
          class="flex h-11 min-w-0 flex-1 flex-col items-center justify-center"
          aria-haspopup="dialog"
          (click)="open.emit()"
        >
          <span class="max-w-full truncate text-[15px] font-semibold">{{
            position.piece.name
          }}</span>
          <span class="max-w-full truncate text-[11.5px] text-muted">
            {{ position.index + 1 }} of {{ position.count }} · {{ position.setlist.name }}
          </span>
        </button>
        <button
          type="button"
          class="flex size-11 items-center justify-center disabled:opacity-30"
          aria-label="Next piece"
          [disabled]="position.index >= position.count - 1"
          (click)="step(1)"
        >
          <app-icon name="chevron-right" [size]="18" [strokeWidth]="2.2" />
        </button>
      </div>
    }
  `,
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
