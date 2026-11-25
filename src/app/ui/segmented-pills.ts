import { Component, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { lgUniqueId } from '@domideimel/ng-liquid-glass';
import { LgSegment, LgSegmented } from '@domideimel/ng-liquid-glass/segmented';

export interface PillOption<T> {
  readonly value: T;
  readonly label: string;
}

/**
 * Segmented control for values of any type: `lgSegmented` with native radios, so arrow keys and
 * screen readers work as in any radio group. Compact density (32 px segments, 24 px targets, WCAG 2.5.8)
 * keeps four to six options on one phone-width row. Bind it with `[formField]` or `[(value)]`.
 */
@Component({
  selector: 'app-segmented-pills',
  imports: [LgSegment, LgSegmented],
  templateUrl: './segmented-pills.html',
  host: { class: 'block', 'data-density': 'compact' },
})
export class SegmentedPills<T> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<readonly PillOption<T>[]>();
  readonly label = input.required<string>();
  readonly disabled = input(false);

  protected readonly groupName = lgUniqueId('app-segmented');
}
