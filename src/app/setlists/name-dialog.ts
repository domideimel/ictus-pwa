import { Component, input, linkedSignal, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { LgButton } from '@domideimel/ng-liquid-glass/button';
import { LgDialog, LgDialogClose, LgDialogTitle } from '@domideimel/ng-liquid-glass/dialog';
import { LgFormField, LgInput, LgLabel } from '@domideimel/ng-liquid-glass/forms';

/** Small modal asking for a setlist or piece name. Uses a signal form so an empty name can't be saved. */
@Component({
  selector: 'app-name-dialog',
  imports: [
    FormField,
    LgButton,
    LgDialog,
    LgDialogClose,
    LgDialogTitle,
    LgFormField,
    LgInput,
    LgLabel,
  ],
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

  protected readonly open = signal(true);

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.nameForm, () => {
      this.saved.emit(this.model().name.trim());
      this.open.set(false);
      return Promise.resolve();
    });
  }
}
