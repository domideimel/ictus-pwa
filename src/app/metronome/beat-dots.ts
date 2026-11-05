import { Component, computed, inject, input } from '@angular/core';
import { BeatLevel, levelTitle } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';

/** One dot per beat, in rows of up to eight. Tap to cycle accent → normal → mute; group starts get an amber mark. */
@Component({
  selector: 'app-beat-dots',
  host: { class: 'flex flex-col gap-2' },
  template: `
    @for (row of rows(); track $index) {
      <div class="flex" [class]="spreadOut() ? 'justify-between px-3' : 'gap-5'">
        @for (index of row; track index) {
          @let level = store.levels()[index];
          @let current = store.isPlaying() && store.currentBeat() === index;
          <button
            type="button"
            class="flex flex-col items-center gap-1"
            [attr.aria-label]="
              'Beat ' + (index + 1) + ', ' + title(level) + (current ? ', playing' : '')
            "
            (click)="store.cycleLevel(index)"
          >
            <span
              class="flex items-center justify-center rounded-full tabular transition-colors duration-75 motion-reduce:transition-none"
              [class]="dotClasses(level, current)"
              [style.width.px]="size()"
              [style.height.px]="size()"
              [style.font-size.px]="size() * 0.35"
            >
              {{ index + 1 }}
            </span>
            <span
              class="size-[5px] rounded-full"
              [class.bg-accent]="store.groupStarts().has(index)"
            ></span>
          </button>
        }
      </div>
    }
  `,
})
export class BeatDots {
  protected readonly store = inject(MetronomeStore);
  readonly spreadOut = input(true);
  readonly maxSize = input(52);

  protected readonly size = computed(() => {
    const count = this.store.levels().length;
    return count <= 5
      ? this.maxSize()
      : count <= 7
        ? Math.min(this.maxSize(), 42)
        : Math.min(this.maxSize(), 36);
  });

  protected readonly rows = computed(() => {
    const count = this.store.levels().length;
    const rows: number[][] = [];
    for (let start = 0; start < count; start += 8) {
      rows.push(Array.from({ length: Math.min(8, count - start) }, (_, i) => start + i));
    }
    return rows;
  });

  protected readonly title = levelTitle;

  protected dotClasses(level: BeatLevel, current: boolean): string {
    if (level === BeatLevel.Mute) {
      return `border-2 border-dashed border-ring font-semibold text-faint ${current ? 'bg-stroke' : 'bg-transparent'}`;
    }
    if (current) return 'border-[3px] border-accent bg-accent font-bold text-on-accent';
    if (level === BeatLevel.Accent)
      return 'border-[3px] border-accent bg-surface font-bold text-accent-text';
    return 'border-2 border-ring bg-surface font-semibold text-fg';
  }
}
