import { Component, input } from '@angular/core';

/** Titled, rounded group of rows; separate rows with `<hr class="border-stroke">`. */
@Component({
  selector: 'app-settings-group',
  templateUrl: './settings-group.html',
  host: { class: 'flex flex-col gap-1.5' },
})
export class SettingsGroup {
  readonly title = input.required<string>();
  readonly footnote = input<string>();
}

/** Label on the left, control on the right, at least 48 px tall. */
@Component({
  selector: 'app-settings-row',
  templateUrl: './settings-row.html',
  host: { class: 'flex min-h-12 items-center justify-between gap-2 ps-4 pe-3 text-15' },
})
export class SettingsRow {
  readonly label = input.required<string>();
  readonly labelId = input<string>();
}
