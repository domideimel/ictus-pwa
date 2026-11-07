import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MetronomePanel } from '../metronome/metronome-panel';
import { TunerStore } from '../state/tuner.store';
import { UiStore } from '../state/ui.store';
import { TunerPanel } from '../tuner/tuner-panel';
import { HeaderIconButton } from '../ui/header-icon-button';
import { Viewport } from '../ui/viewport';

/** Tablet and desktop: metronome and tuner on one screen, side by side from 1024 px, stacked below. */
@Component({
  selector: 'app-combined-view',
  imports: [MetronomePanel, TunerPanel, HeaderIconButton, NgOptimizedImage],
  templateUrl: './combined-view.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class CombinedView {
  protected readonly tuner = inject(TunerStore);
  protected readonly ui = inject(UiStore);
  protected readonly viewport = inject(Viewport);

  protected readonly shortcuts = [
    { key: 'Space', action: 'Start / stop' },
    { key: 'T', action: 'Tap tempo' },
    { key: '← →', action: 'Pedal left / right' },
  ];
}
