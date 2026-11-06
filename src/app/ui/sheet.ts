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
  template: `
    <!-- Clicking the backdrop is a mouse shortcut; the native dialog closes on Escape. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      class="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[20px] border border-stroke bg-bg p-0 text-fg sm:m-auto sm:max-w-[min(34rem,calc(100vw-2rem))] sm:rounded-[20px]"
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
      (click)="onBackdropClick($event)"
    >
      <div class="flex max-h-[92dvh] flex-col">
        <header class="flex shrink-0 items-center gap-2 ps-5 pe-4 pt-4 pb-2">
          <h2 class="text-[22px] font-semibold" [id]="titleId">{{ title() }}</h2>
          <span class="flex-1"></span>
          <ng-content select="[sheetAccessory]" />
          <app-header-icon-button icon="close" [label]="closeLabel()" (pressed)="close()" />
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-6 safe-bottom">
          <ng-content />
        </div>
      </div>
    </dialog>
  `,
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
