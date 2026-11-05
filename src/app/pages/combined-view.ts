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
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <header
      class="flex h-16 shrink-0 items-center justify-between border-b border-stroke bg-panel px-6 lg:px-8"
    >
      <div class="flex items-center gap-3">
        <img ngSrc="icons/icon.svg" alt="" width="28" height="28" priority />
        <h1 class="text-[17px] font-semibold">Metronome &amp; Tuner</h1>
      </div>
      <div class="flex items-center gap-3">
        <span
          class="flex h-9 items-center gap-2 rounded-full border border-stroke bg-surface px-3.5 text-sm text-muted"
          role="status"
        >
          <span
            class="size-2 rounded-full"
            [class]="tuner.isListening() ? 'bg-in-tune' : 'bg-ring'"
          ></span>
          {{
            tuner.isListening()
              ? viewport.width() >= 1024
                ? 'Microphone on'
                : 'Mic on'
              : viewport.width() >= 1024
                ? 'Microphone off'
                : 'Mic off'
          }}
        </span>
        <app-header-icon-button icon="settings" label="Settings" (pressed)="ui.openSettings()" />
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto grid w-full max-w-[1312px] gap-5 p-6 lg:grid-cols-2 lg:gap-6 lg:px-8">
        <app-metronome-panel [wide]="true" />
        <app-tuner-panel [wide]="true" />
      </div>
    </main>

    @if (viewport.finePointer()) {
      <footer
        class="hidden h-12 shrink-0 items-center justify-center gap-6 border-t border-stroke text-[13px] text-muted lg:flex"
      >
        @for (shortcut of shortcuts; track shortcut.key) {
          <span class="flex items-center gap-2">
            <kbd
              class="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-kbd bg-surface px-2 font-sans text-xs text-fg"
            >
              {{ shortcut.key }}
            </kbd>
            {{ shortcut.action }}
          </span>
        }
      </footer>
    }
  `,
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
