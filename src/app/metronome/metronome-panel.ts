import { Component, computed, inject, input, signal } from '@angular/core';
import { canSwing, groupingOptions, signatureLabel } from '../music/meter';
import { LibraryStore } from '../state/library.store';
import { clamp } from '../shared/numbers';
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

/** Height of the phone screen around the dial: header, beats, meter, subdivision, tap row and tabs. */
const PHONE_FIXED_HEIGHT = 640;
/** Rows that only show up sometimes, each taking this much height from the dial. */
const SETLIST_BAR_HEIGHT = 52;
const PRACTICE_CHIPS_HEIGHT = 44;
const GROUPING_ROWS_HEIGHT = 84;
const SWING_SLIDER_HEIGHT = 44;
/** The dial's size range on phones; below the smallest the screen scrolls instead. */
const PHONE_DIAL = { min: 140, max: 248 } as const;

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
    const optional =
      (this.library.activePosition() ? SETLIST_BAR_HEIGHT : 0) +
      (this.store.activePractice().length > 0 ? PRACTICE_CHIPS_HEIGHT : 0) +
      (groupingOptions(this.store.timeSignature()).length > 0 ? GROUPING_ROWS_HEIGHT : 0) +
      (this.swingAvailable() ? SWING_SLIDER_HEIGHT : 0);
    return clamp(
      this.viewport.height() - PHONE_FIXED_HEIGHT - optional,
      PHONE_DIAL.min,
      PHONE_DIAL.max,
    );
  });
}
