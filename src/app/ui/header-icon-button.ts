import { Component, computed, input, output } from '@angular/core';
import type { IconName } from './icon';
import { Icon } from './icon';
import { LgButton } from '@domideimel/ng-liquid-glass/button';

/** Round icon button (`lgButton shape="circle"`) used in screen headers; `badge` shows how many things behind it are on. */
@Component({
  selector: 'app-header-icon-button',
  imports: [Icon, LgButton],
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
