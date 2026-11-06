import { Component, computed, inject, output } from '@angular/core';
import { gapSummary, trainerSummary } from '../music/practice';
import type { PracticeTool } from '../state/metronome.store';
import { MetronomeStore } from '../state/metronome.store';
import { Icon } from '../ui/icon';

const TOOL_NAMES: Readonly<Record<PracticeTool, string>> = {
  gapClick: 'gap click',
  polyrhythm: 'polyrhythm',
  speedTrainer: 'speed trainer',
};

/**
 * A chip per practice tool that is switched on. The chip opens the practice sheet, its × turns the tool
 * off; with more than one on, "Turn all off" clears them in one tap.
 */
@Component({
  selector: 'app-practice-status',
  imports: [Icon],
  template: `
    @if (chips().length > 0) {
      <div
        role="group"
        aria-label="Practice tools on"
        class="flex min-h-11 flex-wrap items-center justify-center gap-1.5"
      >
        @for (chip of chips(); track chip.tool) {
          <span
            class="flex h-8 items-center rounded-full bg-accent/15 text-[12.5px] font-semibold text-accent-text tabular"
          >
            <button
              type="button"
              class="h-full rounded-s-full ps-3 pe-1"
              aria-haspopup="dialog"
              aria-description="Opens practice tools"
              (click)="open.emit()"
            >
              {{ chip.label }}
            </button>
            <button
              type="button"
              class="flex size-8 items-center justify-center rounded-full active:bg-accent/20"
              [attr.aria-label]="'Turn off ' + chip.name"
              (click)="store.turnOffPractice(chip.tool)"
            >
              <app-icon name="close" [size]="14" [strokeWidth]="2.4" />
            </button>
          </span>
        }
        @if (chips().length > 1) {
          <button
            type="button"
            class="h-8 rounded-full px-2.5 text-[12.5px] font-semibold text-muted underline underline-offset-2"
            (click)="store.turnOffPractice()"
          >
            Turn all off
          </button>
        }
      </div>
    }
  `,
})
export class PracticeStatus {
  protected readonly store = inject(MetronomeStore);
  readonly open = output();

  protected readonly chips = computed(() =>
    this.store.activePractice().map((tool) => ({
      tool,
      name: TOOL_NAMES[tool],
      label: this.label(tool),
    })),
  );

  /** Read inside `chips`, so the labels follow the live gap and trainer state while playing. */
  private label(tool: PracticeTool): string {
    const { gapClick, polyrhythm, speedTrainer } = this.store.practice();
    switch (tool) {
      case 'gapClick':
        return this.store.isInGap() ? 'Silent · keep time' : gapSummary(gapClick);
      case 'polyrhythm':
        return `Poly ${polyrhythm}`;
      case 'speedTrainer':
        return this.store.isPlaying()
          ? `Trainer · now ${this.store.currentTempo()} → ${speedTrainer.target}`
          : trainerSummary(speedTrainer);
    }
  }
}
