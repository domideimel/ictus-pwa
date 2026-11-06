import { Component, inject } from '@angular/core';
import { MetronomePanel } from '../metronome/metronome-panel';
import { UiStore } from '../state/ui.store';
import { HeaderIconButton } from '../ui/header-icon-button';

/** Phone tab: tempo marking, dial, beats, meter, subdivision, and the tap / start row. */
@Component({
  selector: 'app-metronome-page',
  imports: [MetronomePanel, HeaderIconButton],
  template: `
    <app-metronome-panel class="flex-1">
      <app-header-icon-button
        headerEnd
        icon="settings"
        label="Settings"
        (pressed)="ui.openSettings()"
      />
    </app-metronome-panel>
  `,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export default class MetronomePage {
  protected readonly ui = inject(UiStore);
}
