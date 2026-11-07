import { Component, computed, inject, input, signal } from '@angular/core';
import type { Pulse } from '../music/meter';
import {
  QUICK_PICKS,
  durationTitle,
  groupingOptions,
  sameSignature,
  signatureLabel,
} from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import type { PillOption } from '../ui/segmented-pills';
import { SegmentedPills } from '../ui/segmented-pills';
import { Surface } from '../ui/surface';
import { TimeSignatureSheet } from './time-signature-sheet';

/** Quick picks plus "More" for any meter up to 16 beats; scrolls on phones, wraps on wider screens. */
@Component({
  selector: 'app-time-signature-chips',
  imports: [SegmentedPills, Surface, TimeSignatureSheet],
  templateUrl: './time-signature-chips.html',
  host: { class: 'flex flex-col gap-2' },
})
export class TimeSignatureChips {
  protected readonly store = inject(MetronomeStore);
  readonly wraps = input(false);

  protected readonly quickPicks = QUICK_PICKS;
  protected readonly showCustom = signal(false);
  protected readonly label = signatureLabel;
  protected readonly isCustom = computed(
    () => !QUICK_PICKS.some((pick) => sameSignature(pick, this.store.timeSignature())),
  );
  /** Grouping for odd meters, e.g. 7/8 as 2+2+3 or 3+2+2. Empty for simple meters. */
  protected readonly groupings = computed(() => groupingOptions(this.store.timeSignature()));
  /** Every note (11 in 11/8) or every group (4 for 3+3+3+2), which makes the beats uneven. */
  protected readonly pulses = computed<PillOption<Pulse>[]>(() => {
    const { beats, unit } = this.store.timeSignature();
    const notes = unit === 2 ? 'Halves' : `${capitalize(durationTitle(1, unit))}s`;
    return [
      { value: 'unit', label: `${notes} · ${beats}` },
      { value: 'group', label: `Groups · ${this.store.grouping().length}` },
    ];
  });

  protected isSelected(signature: Parameters<typeof signatureLabel>[0]): boolean {
    return sameSignature(signature, this.store.timeSignature());
  }
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
