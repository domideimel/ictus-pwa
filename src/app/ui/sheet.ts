import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';

/**
 * Bottom sheet on phones, centered card on wider screens. Built on the native modal `<dialog>`,
 * so focus is trapped, Escape closes it and the page behind is inert.
 * Render it with `@if`; it opens itself and emits `closed` when dismissed.
 */
@Component({
  selector: 'app-sheet',
  template: `
    <dialog
      #dialog
      class="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[20px] border border-stroke bg-bg p-0 text-fg sm:m-auto sm:max-w-[min(34rem,calc(100vw-2rem))] sm:rounded-[20px]"
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
      (click)="onBackdropClick($event)"
    >
      <div class="flex max-h-[92dvh] flex-col">
        <header class="flex shrink-0 items-center gap-2 px-5 pt-5 pb-2">
          <h2 [id]="titleId" class="text-2xl font-bold">{{ title() }}</h2>
          <span class="flex-1"></span>
          <ng-content select="[sheetAccessory]" />
          <button
            type="button"
            class="h-11 px-1 text-base font-semibold text-accent-text"
            (click)="close()"
          >
            {{ doneLabel() }}
          </button>
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
  readonly doneLabel = input('Done');
  readonly closed = output();

  protected readonly titleId = `sheet-title-${Sheet.nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click on the dialog element itself (not its content) is a click on the backdrop. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
