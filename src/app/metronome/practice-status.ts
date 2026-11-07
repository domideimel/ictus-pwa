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
  templateUrl: './practice-status.html',
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
