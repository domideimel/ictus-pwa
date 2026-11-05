import { Component, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

export interface PillOption<T> {
  readonly value: T;
  readonly label: string;
}

/**
 * Compact segmented control in the concept's style. A radio group for assistive tech;
 * bind it with `[formField]` or `[(value)]`.
 */
@Component({
  selector: 'app-segmented-pills',
  host: {
    role: 'radiogroup',
    class: 'flex gap-0.5 rounded-[9px] bg-bg p-0.5',
    '[attr.aria-label]': 'label()',
    '[attr.aria-disabled]': 'disabled() || null',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @for (option of options(); track option.value) {
      @let selected = option.value === value();
      <button
        type="button"
        role="radio"
        class="h-8 min-w-0 flex-1 truncate rounded-[7px] px-2 text-[13px]"
        [class]="selected ? 'bg-segment font-semibold text-fg' : 'text-muted'"
        [attr.aria-checked]="selected"
        [tabIndex]="selected ? 0 : -1"
        [disabled]="disabled()"
        (click)="select(option.value)"
      >
        {{ option.label }}
      </button>
    }
  `,
})
export class SegmentedPills<T> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<readonly PillOption<T>[]>();
  readonly label = input.required<string>();
  readonly disabled = input(false);

  protected select(value: T): void {
    this.value.set(value);
  }

  /** Arrow keys move the selection, as in a native radio group. */
  protected onKeydown(event: KeyboardEvent): void {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const options = this.options();
    const index = options.findIndex((option) => option.value === this.value());
    const next = options[(index + step + options.length) % options.length];
    this.select(next.value);
    const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'button',
    );
    buttons[options.indexOf(next)]?.focus();
  }
}
