import { Component, computed, inject, input } from '@angular/core';
import { BeatLevel, durationTitle, levelTitle } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';

/**
 * One dot per beat, in rows of up to eight. Tap to cycle accent → normal → mute; group starts get an amber
 * mark. Counting uneven groups, the long beats are wider pills so 3+3+3+2 reads long-long-long-short.
 */
@Component({
  selector: 'app-beat-dots',
  template: `
    @for (row of rows(); track $index) {
      <div class="flex" [class]="spreadOut() ? 'justify-between px-3' : 'gap-5'">
        @for (dot of row; track dot.index) {
          <button
            type="button"
            class="flex flex-col items-center gap-1"
            [attr.aria-label]="dot.label"
            (click)="store.cycleLevel(dot.index)"
          >
            <span
              class="flex items-center justify-center rounded-full tabular transition-colors duration-75 motion-reduce:transition-none"
              [class]="dot.classes"
              [style.width.px]="size() * dot.width"
              [style.height.px]="size()"
              [style.font-size.px]="size() * 0.35"
            >
              {{ dot.index + 1 }}
            </span>
            <span class="size-[5px] rounded-full" [class.bg-accent]="dot.groupStart"></span>
          </button>
        }
      </div>
    }
  `,
  host: { class: 'flex flex-col gap-2' },
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
    const playing = this.store.isPlaying() ? this.store.currentBeat() : null;
    const groupStarts = this.store.groupStarts();
    const lengths = this.store.beatLengths();
    const shortest = Math.min(...lengths);
    const uneven = lengths.some((length) => length !== shortest);
    const unit = this.store.timeSignature().unit;
    const dots = this.store.levels().map((level, index) => {
      const current = playing === index;
      const length = lengths[index] ?? shortest;
      const note = uneven ? `, ${durationTitle(length, unit)}` : '';
      return {
        index,
        label: `Beat ${index + 1}${note}, ${levelTitle(level)}${current ? ', playing' : ''}`,
        classes: dotClasses(level, current),
        groupStart: groupStarts.has(index),
        width: uneven ? length / shortest : 1,
      };
    });
    const rows: (typeof dots)[] = [];
    for (let start = 0; start < dots.length; start += 8) rows.push(dots.slice(start, start + 8));
    return rows;
  });
}

function dotClasses(level: BeatLevel, current: boolean): string {
  if (level === BeatLevel.Mute) {
    return `border-2 border-dashed border-ring font-semibold text-faint ${current ? 'bg-stroke' : 'bg-transparent'}`;
  }
  if (current) return 'border-[3px] border-accent bg-accent font-bold text-on-accent';
  if (level === BeatLevel.Accent)
    return 'border-[3px] border-accent bg-surface font-bold text-accent-text';
  return 'border-2 border-ring bg-surface font-semibold text-fg';
}
