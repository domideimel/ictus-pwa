import { Component, input, output, signal } from '@angular/core';
import { LgButton } from '@domideimel/ng-liquid-glass/button';
import { LgDialog, LgDialogClose, LgDialogTitle } from '@domideimel/ng-liquid-glass/dialog';
import { Icon } from './icon';

/**
 * Bottom sheet on phones, centred dialog on wider screens: `lg-dialog placement="sheet"` with a title,
 * an optional accessory (`sheetAccessory`) and a round close button. Render it with `@if`; it opens
 * itself and emits `closed` when dismissed (close button, Escape or a click on the backdrop).
 */
@Component({
  selector: 'app-sheet',
  imports: [Icon, LgButton, LgDialog, LgDialogClose, LgDialogTitle],
  templateUrl: './sheet.html',
})
export class Sheet {
  readonly title = input.required<string>();
  /** Accessible name of the round × button, e.g. "Cancel" when closing discards the input. */
  readonly closeLabel = input('Close');
  readonly closed = output();

  protected readonly open = signal(true);

  close(): void {
    this.open.set(false);
  }
}
