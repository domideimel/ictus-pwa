import type { ElementRef } from '@angular/core';
import { Component, afterNextRender, input, output, viewChild } from '@angular/core';
import { HeaderIconButton } from './header-icon-button';

/**
 * Bottom sheet on phones, centered card on wider screens. Built on the native modal `<dialog>`,
 * so focus is trapped, Escape closes it and the page behind is inert.
 * Render it with `@if`; it opens itself and emits `closed` when dismissed.
 */
@Component({
  selector: 'app-sheet',
  imports: [HeaderIconButton],
  templateUrl: './sheet.html',
})
export class Sheet {
  private static nextId = 0;

  readonly title = input.required<string>();
  /** Accessible name of the round × button, e.g. "Cancel" when closing discards the input. */
  readonly closeLabel = input('Close');
  readonly closed = output();

  protected readonly titleId = `sheet-title-${Sheet.nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
    });
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click on the dialog element itself (not its content) is a click on the backdrop. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
