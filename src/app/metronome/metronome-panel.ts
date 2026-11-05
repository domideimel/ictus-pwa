import { Component, computed, inject, input, signal } from '@angular/core';
import { canSwing, groupingOptions, signatureLabel, subdivisionInfo } from '../music/meter';
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
  host: { class: 'flex min-h-0 flex-col' },
  template: `
    @if (wide()) {
      <section
        aria-labelledby="metronome-title"
        class="flex flex-col gap-6 rounded-[20px] border border-stroke bg-panel p-6 lg:p-7"
      >
        <header class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <app-section-label id="metronome-title">Metronome</app-section-label>
            <span class="text-xl font-semibold">{{ store.tempoMarking() }}</span>
          </div>
          <div class="flex gap-2">
            <app-header-icon-button
              icon="setlist"
              label="Setlists"
              (pressed)="showSetlists.set(true)"
            />
            <app-header-icon-button
              icon="practice"
              label="Practice tools"
              (pressed)="showPractice.set(true)"
            />
          </div>
        </header>

        <app-setlist-bar (open)="showSetlists.set(true)" />
        <app-practice-status (open)="showPractice.set(true)" />

        <div class="flex flex-wrap items-center gap-7 lg:gap-8">
          <app-tempo-dial [diameter]="viewport.width() >= 1280 ? 240 : 220" />
          <div class="flex min-w-60 flex-1 flex-col gap-3">
            <app-nudge-buttons [height]="48" />
            <div class="flex items-center gap-4">
              <app-play-button [size]="viewport.width() >= 1280 ? 112 : 104" />
              <button
                type="button"
                appSurface
                class="h-[72px] flex-1 rounded-2xl text-base font-semibold"
                (click)="store.tap()"
              >
                Tap tempo
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <app-section-label
            >Beats · {{ viewport.finePointer() ? 'click' : 'tap' }} to accent</app-section-label
          >
          <app-beat-dots [spreadOut]="false" [maxSize]="56" />
        </div>

        <div class="flex flex-col gap-2.5">
          <app-section-label>Time signature</app-section-label>
          <app-time-signature-chips [wraps]="true" />
        </div>

        <app-subdivision-picker [horizontal]="true" />
        @if (swingAvailable()) {
          <app-swing-slider />
        }
      </section>
    } @else {
      <header class="flex items-center justify-between px-5 pt-3">
        <div class="flex flex-col gap-0.5">
          <app-section-label>Tempo</app-section-label>
          <h1 class="text-xl font-semibold">{{ store.tempoMarking() }}</h1>
        </div>
        <div class="flex gap-2">
          <app-header-icon-button
            icon="setlist"
            label="Setlists"
            (pressed)="showSetlists.set(true)"
          />
          <app-header-icon-button
            icon="practice"
            label="Practice tools"
            (pressed)="showPractice.set(true)"
          />
          <ng-content select="[headerEnd]" />
        </div>
      </header>

      <app-setlist-bar class="px-5 pt-2" (open)="showSetlists.set(true)" />

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div class="flex flex-col items-center pt-2">
          <app-tempo-dial [diameter]="phoneDial()" />
          <app-nudge-buttons class="mt-1 w-[292px]" />
          <app-practice-status class="px-5" (open)="showPractice.set(true)" />
        </div>

        <div class="flex flex-col gap-2.5 px-5 pt-4">
          <app-section-label>Beats · tap to accent</app-section-label>
          <app-beat-dots />
        </div>

        <div class="flex flex-col gap-2.5 pt-4">
          <app-section-label class="px-5">Time signature</app-section-label>
          <app-time-signature-chips />
        </div>

        <div class="flex flex-col gap-2.5 px-5 pt-4 pb-2">
          <app-section-label>Subdivision</app-section-label>
          <app-subdivision-picker />
          @if (swingAvailable()) {
            <app-swing-slider />
          }
        </div>
      </div>

      <div class="flex items-center justify-between px-7 pt-2 pb-3">
        <button
          type="button"
          appSurface
          class="size-[72px] rounded-full text-[15px] font-semibold"
          aria-label="Tap tempo"
          (click)="store.tap()"
        >
          Tap
        </button>
        <app-play-button />
        <div
          class="flex size-[72px] flex-col items-center justify-center"
          aria-label="Current meter and tempo"
          role="group"
        >
          <span class="text-xl font-semibold tabular">{{ signature() }}</span>
          <span class="text-[11.5px] text-muted tabular">
            <span class="font-music">{{ symbol() }}</span> · {{ store.currentTempo() }}
          </span>
        </div>
      </div>
    }

    @if (showPractice()) {
      <app-practice-sheet (closed)="showPractice.set(false)" />
    }
    @if (showSetlists()) {
      <app-setlist-sheet (closed)="showSetlists.set(false)" />
    }
  `,
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
  protected readonly symbol = computed(() => subdivisionInfo(this.store.subdivision()).symbol);

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
      (groupingOptions(this.store.timeSignature()).length > 0 ? 42 : 0) +
      (this.swingAvailable() ? 44 : 0);
    return Math.min(248, Math.max(140, this.viewport.height() - 640 - optional));
  });
}
