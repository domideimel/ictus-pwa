import type { ElementRef } from '@angular/core';
import { Component, afterNextRender, input, output, viewChild } from '@angular/core';
import { Surface } from './surface';

/**
 * Small modal that asks before something can't be undone, e.g. deleting a setlist. Cancel is focused
 * first, so Enter or a stray tap doesn't confirm. Render it with `@if`; it opens itself.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Surface],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  private static nextId = 0;

  readonly title = input.required<string>();
  readonly message = input.required<string>();
  /** The action, e.g. "Delete"; the button says what it does. */
  readonly action = input.required<string>();
  readonly confirmed = output();
  readonly closed = output();

  private readonly id = ConfirmDialog.nextId++;
  protected readonly titleId = `confirm-title-${this.id}`;
  protected readonly messageId = `confirm-message-${this.id}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancel = viewChild.required<ElementRef<HTMLButtonElement>>('cancel');

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.cancel().nativeElement.focus();
    });
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.dialog().nativeElement.close();
  }
}
