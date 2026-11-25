import { Component, input, output, signal } from '@angular/core';
import { LgButton } from '@domideimel/ng-liquid-glass/button';
import {
  LgDialog,
  LgDialogClose,
  LgDialogDescription,
  LgDialogTitle,
} from '@domideimel/ng-liquid-glass/dialog';

/**
 * Asks before something can't be undone, e.g. deleting a setlist: an `lg-dialog alert`. Cancel is
 * focused first, so Enter or a stray tap doesn't confirm. Render it with `@if`; it opens itself.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [LgButton, LgDialog, LgDialogClose, LgDialogDescription, LgDialogTitle],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  /** The action, e.g. "Delete"; the button says what it does. */
  readonly action = input.required<string>();
  /** Shows the action in the danger colour, for deleting rather than overwriting. */
  readonly danger = input(false);
  readonly confirmed = output();
  readonly closed = output();

  protected readonly open = signal(true);

  protected confirm(): void {
    this.confirmed.emit();
    this.open.set(false);
  }
}
