import { Component, computed, input, output } from '@angular/core';
import type { IconName } from './icon';
import { Icon } from './icon';
import { Surface } from './surface';

/** Round 44 px icon button used in screen headers; `badge` shows how many things behind it are on. */
@Component({
  selector: 'app-header-icon-button',
  imports: [Icon, Surface],
  templateUrl: './header-icon-button.html',
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
