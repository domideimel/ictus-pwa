import { Component, input } from '@angular/core';

/** Titled, rounded group of rows; separate rows with `<hr class="border-stroke">`. */
@Component({
  selector: 'app-settings-group',
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <h3 class="ps-1 text-xs uppercase tracking-[0.08em] text-muted">{{ title() }}</h3>
    <div class="flex flex-col overflow-hidden rounded-[14px] bg-surface [&>hr]:border-stroke">
      <ng-content />
    </div>
    @if (footnote(); as footnote) {
      <p class="px-1 text-xs text-muted">{{ footnote }}</p>
    }
  `,
})
export class SettingsGroup {
  readonly title = input.required<string>();
  readonly footnote = input<string>();
}

/** Label on the left, control on the right, at least 48 px tall. */
@Component({
  selector: 'app-settings-row',
  host: { class: 'flex min-h-12 items-center justify-between gap-2 ps-4 pe-3 text-[15px]' },
  template: `
    <span [id]="labelId()">{{ label() }}</span>
    <ng-content />
  `,
})
export class SettingsRow {
  readonly label = input.required<string>();
  readonly labelId = input<string>();
}
