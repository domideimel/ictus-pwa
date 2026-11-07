import { Component, computed, inject, input, signal } from '@angular/core';
import { canSwing, groupingOptions, signatureLabel } from '../music/meter';
import { LibraryStore } from '../state/library.store';
import { MetronomeStore } from '../state/metronome.store';
import { SetlistBar } from '../setlists/setlist-bar';
import { SetlistSheet } from '../setlists/setlist-sheet';
import { HeaderIconButton } from '../ui/header-icon-button';
import { SectionLabel } from '../ui/section-label';
import { Surface } from '../ui/surface';
import { Viewport } from '../ui/viewport';
import { BeatDots } from './beat-dots';
import { NudgeButtons } from './nudge-buttons';
import { PlayButton } from './play-button';
import { PracticeSheet } from './practice-sheet';
import { PracticeStatus } from './practice-status';
import { SubdivisionPicker } from './subdivision-picker';
import { SwingSlider } from './swing-slider';
import { TempoDial } from './tempo-dial';
import { TimeSignatureChips } from './time-signature-chips';

/**
 * The whole metronome. Phone: full screen with the tap / start row at the bottom.
 * Tablet and desktop: a card beside (or above) the tuner, as in the web concept.
 */
@Component({
  selector: 'app-metronome-panel',
  imports: [
    BeatDots,
    HeaderIconButton,
    NudgeButtons,
    PlayButton,
    PracticeSheet,
    PracticeStatus,
    SectionLabel,
    SetlistBar,
    SetlistSheet,
    SubdivisionPicker,
    Surface,
    SwingSlider,
    TempoDial,
    TimeSignatureChips,
  ],
  templateUrl: './metronome-panel.html',
  host: { class: 'flex min-h-0 flex-col' },
})
export class MetronomePanel {
  protected readonly store = inject(MetronomeStore);
  protected readonly viewport = inject(Viewport);
  private readonly library = inject(LibraryStore);
  readonly wide = input(false);

  protected readonly showPractice = signal(false);
  protected readonly showSetlists = signal(false);

  protected readonly swingAvailable = computed(() => canSwing(this.store.subdivision()));
  protected readonly signature = computed(() => signatureLabel(this.store.timeSignature()));
  protected readonly symbol = computed(() => this.store.subdivisionInfo().symbol);

  /**
   * The dial shrinks to fit whatever rows are showing (setlist, practice chips, grouping, swing);
   * only below 140 px does the screen scroll.
   */
  protected readonly phoneDial = computed(() => {
    const practice = this.store.practice();
    const optional =
      (this.library.activePosition() ? 52 : 0) +
      (practice.gapClick.enabled || practice.speedTrainer.enabled || practice.polyrhythm !== 'off'
        ? 44
        : 0) +
      (groupingOptions(this.store.timeSignature()).length > 0 ? 84 : 0) +
      (this.swingAvailable() ? 44 : 0);
    return Math.min(248, Math.max(140, this.viewport.height() - 640 - optional));
  });
}
