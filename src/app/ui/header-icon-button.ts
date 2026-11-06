import { Component, computed, input, output } from '@angular/core';
import type { IconName } from './icon';
import { Icon } from './icon';
import { Surface } from './surface';

/** Round 44 px icon button used in screen headers; `badge` shows how many things behind it are on. */
@Component({
  selector: 'app-header-icon-button',
  imports: [Icon, Surface],
  template: `
    <button
      type="button"
      appSurface
      class="relative size-11 rounded-full"
      [attr.aria-label]="fullLabel()"
      (click)="pressed.emit()"
    >
      <app-icon [name]="icon()" />
      @if (badge() > 0) {
        <span
          class="absolute -end-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent tabular"
          aria-hidden="true"
        >
          {{ badge() }}
        </span>
      }
    </button>
  `,
})
export class HeaderIconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly badge = input(0);
  readonly pressed = output();

  protected readonly fullLabel = computed(() =>
    this.badge() > 0 ? `${this.label()}, ${this.badge()} on` : this.label(),
  );
}
