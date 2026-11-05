import { Component, inject } from '@angular/core';
import { UiStore } from '../state/ui.store';
import { TunerPanel } from '../tuner/tuner-panel';
import { HeaderIconButton } from '../ui/header-icon-button';

/** Phone tab: reference pitch, mode, staff, note name, state, cents meter, and the start button. */
@Component({
  selector: 'app-tuner-page',
  imports: [TunerPanel, HeaderIconButton],
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <h1 class="sr-only">Tuner</h1>
    <app-tuner-panel class="flex-1">
      <app-header-icon-button
        headerEnd
        icon="settings"
        label="Settings"
        (pressed)="ui.showSettings.set(true)"
      />
    </app-tuner-panel>
  `,
})
export default class TunerPage {
  protected readonly ui = inject(UiStore);
}
