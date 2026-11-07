import type { ElementRef } from '@angular/core';
import { Component, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { signatureLabel } from '../music/meter';
import { MetronomeStore } from '../state/metronome.store';
import { HeaderIconButton } from '../ui/header-icon-button';
import { SectionLabel } from '../ui/section-label';
import { Surface } from '../ui/surface';

/** Full-screen bar counter for long rests, e.g. 87 bars tacet. */
@Component({
  selector: 'app-rest-counter',
  imports: [HeaderIconButton, SectionLabel, Surface],
  templateUrl: './rest-counter.html',
})
export class RestCounter {
  protected readonly store = inject(MetronomeStore);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly signature = computed(() => signatureLabel(this.store.timeSignature()));
  protected readonly bar = computed(() =>
    Math.min(this.store.currentBar() + 1, this.store.rest()?.bars ?? 1),
  );
  /** One dot per count: 11 in 11/8, four when counting it in groups. */
  protected readonly beats = computed(() =>
    Array.from({ length: this.store.levels().length }, (_, i) => i),
  );

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
    });
  }
}
