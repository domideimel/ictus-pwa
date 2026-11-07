import { Component, inject } from '@angular/core';
import { UiStore } from '../state/ui.store';
import { TunerPanel } from '../tuner/tuner-panel';
import { HeaderIconButton } from '../ui/header-icon-button';

/** Phone tab: reference pitch, mode, staff, note name, state, cents meter, and the start button. */
@Component({
  selector: 'app-tuner-page',
  imports: [TunerPanel, HeaderIconButton],
  templateUrl: './tuner-page.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export default class TunerPage {
  protected readonly ui = inject(UiStore);
}
