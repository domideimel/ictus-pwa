import { Component, computed, inject, output } from '@angular/core';
import { gapSummary, trainerSummary } from '../music/practice';
import { MetronomeStore } from '../state/metronome.store';

/** Chips for the practice tools that are switched on; tap to open the practice sheet. */
@Component({
  selector: 'app-practice-status',
  template: `
    @if (chips().length > 0) {
      <button
        type="button"
        class="flex min-h-11 flex-wrap items-center justify-center gap-1.5"
        aria-haspopup="dialog"
        aria-description="Opens practice tools"
        (click)="open.emit()"
      >
        @for (chip of chips(); track chip) {
          <span
            class="flex h-[26px] items-center rounded-full bg-accent/15 px-2.5 text-[12.5px] font-semibold text-accent-text tabular"
          >
            {{ chip }}
          </span>
        }
      </button>
    }
  `,
})
export class PracticeStatus {
  private readonly store = inject(MetronomeStore);
  readonly open = output();

  protected readonly chips = computed(() => {
    const { gapClick, polyrhythm, speedTrainer } = this.store.practice();
    const chips: string[] = [];
    if (gapClick.enabled)
      chips.push(this.store.isInGap() ? 'Silent · keep time' : gapSummary(gapClick));
    if (polyrhythm !== 'off') chips.push(`Poly ${polyrhythm}`);
    if (speedTrainer.enabled) {
      chips.push(
        this.store.isPlaying()
          ? `Trainer · now ${this.store.currentTempo()} → ${speedTrainer.target}`
          : trainerSummary(speedTrainer),
      );
    }
    return chips;
  });
}
