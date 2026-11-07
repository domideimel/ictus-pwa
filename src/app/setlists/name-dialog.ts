import type { ElementRef } from '@angular/core';
import { Component, afterNextRender, input, linkedSignal, output, viewChild } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Surface } from '../ui/surface';

/** Small modal asking for a setlist or piece name. Uses a signal form so an empty name can't be saved. */
@Component({
  selector: 'app-name-dialog',
  imports: [FormField, Surface],
  templateUrl: './name-dialog.html',
})
export class NameDialog {
  readonly title = input.required<string>();
  readonly initialName = input('');
  readonly saved = output<string>();
  readonly closed = output();

  /** Starts from the suggested name, so it is already in the field when it gets selected. */
  protected readonly model = linkedSignal(() => ({ name: this.initialName() }));
  protected readonly nameForm = form(this.model, (path) => {
    required(path.name, { message: 'Enter a name.' });
    maxLength(path.name, 60, { message: 'Use at most 60 characters.' });
    // Whitespace alone counts as empty.
    validate(path.name, ({ value }) =>
      value() !== '' && value().trim() === '' ? { kind: 'blank', message: 'Enter a name.' } : null,
    );
  });

  protected showError(): boolean {
    const field = this.nameForm.name();
    return field.touched() && field.invalid();
  }

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.input().nativeElement.select();
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.nameForm, () => {
      this.saved.emit(this.model().name.trim());
      this.dialog().nativeElement.close();
      return Promise.resolve();
    });
  }
}
