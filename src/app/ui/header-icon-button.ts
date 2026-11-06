import { Component, input, output } from '@angular/core';
import type { IconName } from './icon';
import { Icon } from './icon';
import { Surface } from './surface';

/** Round 44 px icon button used in screen headers. */
@Component({
  selector: 'app-header-icon-button',
  imports: [Icon, Surface],
  template: `
    <button
      type="button"
      appSurface
      class="size-11 rounded-full"
      [attr.aria-label]="label()"
      (click)="pressed.emit()"
    >
      <app-icon [name]="icon()" />
    </button>
  `,
})
export class HeaderIconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly pressed = output();
}
