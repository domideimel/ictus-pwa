import { Component, input } from '@angular/core';

export type IconName =
  | 'settings'
  | 'setlist'
  | 'practice'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'play'
  | 'stop'
  | 'mic'
  | 'close'
  | 'plus'
  | 'more'
  | 'check'
  | 'arrow-up'
  | 'arrow-down'
  | 'trash'
  | 'pencil'
  | 'refresh'
  | 'metronome'
  | 'tuner';

/** Inline stroke icons, so they take the text colour and work offline. Always decorative: label the button. */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(22);
  readonly strokeWidth = input(1.8);
}
