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
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.stroke-width]="strokeWidth()"
    >
      @let icon = name();
      @switch (icon) {
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          />
        }
        @case ('setlist') {
          <path d="M3 6h11M3 11h11M3 16h7" />
          <path d="M18 18V5l3 1.5" />
          <circle cx="16" cy="18" r="2" />
        }
        @case ('practice') {
          <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
        }
        @case ('chevron-left') {
          <path d="M15 18l-6-6 6-6" />
        }
        @case ('chevron-right') {
          <path d="M9 18l6-6-6-6" />
        }
        @case ('chevron-down') {
          <path d="M6 9l6 6 6-6" />
        }
        @case ('play') {
          <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />
        }
        @case ('stop') {
          <rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="currentColor" stroke="none" />
        }
        @case ('mic') {
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('more') {
          <circle cx="6" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="18" cy="12" r="1" fill="currentColor" />
        }
        @case ('check') {
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        }
        @case ('arrow-up') {
          <path d="M12 19V5M6 11l6-6 6 6" />
        }
        @case ('arrow-down') {
          <path d="M12 5v14M6 13l6 6 6-6" />
        }
        @case ('trash') {
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        }
        @case ('pencil') {
          <path d="M4 20h4L19 9l-4-4L4 16z" />
        }
        @case ('refresh') {
          <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4" />
        }
        @case ('metronome') {
          <path d="M9 3h6l4 18H5z" />
          <path d="M12 15l5-9" />
        }
        @case ('tuner') {
          <path d="M4 16a8 8 0 0 1 16 0" />
          <path d="M12 16l3-5" />
          <path d="M4 20h16" />
        }
        @default never;
      }
    </svg>
  `,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(22);
  readonly strokeWidth = input(1.8);
}
