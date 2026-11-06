import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { Surface } from '../ui/surface';

/** Small modal asking for a setlist or piece name. Uses a signal form so an empty name can't be saved. */
@Component({
  selector: 'app-name-dialog',
  imports: [FormField, Surface],
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-stroke bg-surface p-0 text-fg"
      aria-labelledby="name-dialog-title"
      (close)="closed.emit()"
    >
      <form class="flex flex-col gap-4 p-5" (submit)="save($event)">
        <h2 id="name-dialog-title" class="text-center text-[17px] font-semibold">{{ title() }}</h2>
        <label class="flex flex-col gap-1.5 text-sm text-muted">
          Name
          <input
            #input
            type="text"
            autocomplete="off"
            enterkeyhint="done"
            class="h-11 rounded-[10px] border border-stroke bg-bg px-3 text-base text-fg"
            [formField]="nameForm.name"
            [attr.aria-invalid]="showError()"
            aria-describedby="name-dialog-error"
          />
        </label>
        <p id="name-dialog-error" class="-mt-2 min-h-4 text-xs text-accent-text" aria-live="polite">
          @if (showError()) {
            {{ nameForm.name().errors()[0].message }}
          }
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            appSurface
            class="h-11 rounded-xl font-semibold"
            (click)="dialog.close()"
          >
            Cancel
          </button>
          <button type="submit" class="h-11 rounded-xl bg-accent font-semibold text-on-accent">
            Save
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class NameDialog {
  readonly title = input.required<string>();
  readonly initialName = input('');
  readonly saved = output<string>();
  readonly closed = output();

  protected readonly model = signal({ name: '' });
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
      this.model.set({ name: this.initialName() });
      this.dialog().nativeElement.showModal();
      this.input().nativeElement.select();
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    void submit(this.nameForm, async () => {
      this.saved.emit(this.model().name.trim());
      this.dialog().nativeElement.close();
    });
  }
}
