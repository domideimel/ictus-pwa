import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { HoldRepeat } from './hold-repeat';

/**
 * − value + with optional larger steps, e.g. ±1 and ±10. A signal-forms control: `min` and `max`
 * come from the field's schema (`min(path, 1)`) when bound with `[formField]`.
 */
@Component({
  selector: 'app-number-stepper',
  imports: [HoldRepeat, NgTemplateOutlet],
  host: {
    role: 'spinbutton',
    tabindex: '0',
    class: 'flex items-center gap-1 rounded-[10px]',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': 'lower()',
    '[attr.aria-valuemax]': 'upper()',
    '[attr.aria-valuetext]': 'value() + unit()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[class.opacity-40]': 'disabled()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @for (step of reversedSteps(); track step) {
      <ng-container *ngTemplateOutlet="button; context: { $implicit: -step }" />
    }
    <span
      class="min-w-13 text-center text-[15px] font-semibold tabular whitespace-nowrap"
      aria-hidden="true"
    >
      {{ value() }}{{ unit() }}
    </span>
    @for (step of steps(); track step) {
      <ng-container *ngTemplateOutlet="button; context: { $implicit: step }" />
    }

    <ng-template #button let-delta>
      <button
        type="button"
        tabindex="-1"
        class="min-h-9 min-w-9 rounded-[10px] bg-stroke px-1 text-[13px] font-semibold tabular disabled:opacity-30"
        [attr.aria-label]="(delta > 0 ? 'Plus ' : 'Minus ') + abs(delta)"
        [disabled]="disabled() || (delta > 0 ? value() >= upper() : value() <= lower())"
        appHoldRepeat
        (repeat)="change(delta)"
      >
        {{ delta > 0 ? '+' + delta : '−' + abs(delta) }}
      </button>
    </ng-template>
  `,
})
export class NumberStepper implements FormValueControl<number> {
  readonly value = model.required<number>();
  readonly label = input.required<string>();
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly steps = input<readonly number[]>([1]);
  readonly unit = input('');
  readonly disabled = input(false);

  protected readonly lower = computed(() => this.min() ?? Number.MIN_SAFE_INTEGER);
  protected readonly upper = computed(() => this.max() ?? Number.MAX_SAFE_INTEGER);
  protected readonly reversedSteps = computed(() => [...this.steps()].reverse());
  protected readonly abs = Math.abs;

  protected change(delta: number): void {
    this.value.update((value) => Math.min(Math.max(value + delta, this.lower()), this.upper()));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    const big = this.steps().at(-1) ?? 1;
    const deltas: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: big,
      PageDown: -big,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.change(delta);
  }
}
