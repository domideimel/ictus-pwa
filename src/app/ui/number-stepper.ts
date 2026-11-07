import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { HoldRepeat } from './hold-repeat';
import { Surface } from './surface';

/**
 * − value + with optional larger steps, e.g. ±1 and ±10. A signal-forms control: `min` and `max`
 * come from the field's schema (`min(path, 1)`) when bound with `[formField]`.
 */
@Component({
  selector: 'app-number-stepper',
  imports: [HoldRepeat, NgTemplateOutlet, Surface],
  templateUrl: './number-stepper.html',
  host: {
    role: 'spinbutton',
    tabindex: '0',
    class: 'flex items-center gap-1 rounded-10',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': 'lower()',
    '[attr.aria-valuemax]': 'upper()',
    '[attr.aria-valuetext]': 'value() + unit()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[class.opacity-40]': 'disabled()',
    '(keydown)': 'onKeydown($event)',
  },
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
