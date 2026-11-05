import { Directive, booleanAttribute, computed, input } from '@angular/core';

/**
 * Rounded button with a hairline border, used for ±1/±5, Tap, chips and header icons.
 * Selected chips invert to light-on-dark like the concept's time signature chips.
 */
@Directive({
  selector: 'button[appSurface], a[appSurface]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-pressed]': 'pressed() ? selected() : null',
  },
})
export class Surface {
  readonly selected = input(false);
  /** Exposes `selected` as aria-pressed (toggle chips). Leave off for plain buttons. */
  readonly pressed = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      'inline-flex items-center justify-center border transition-[opacity,background-color] active:opacity-70',
      'disabled:opacity-30',
      this.selected()
        ? 'border-fg bg-fg text-bg font-semibold'
        : 'border-stroke bg-surface text-fg font-medium',
    ].join(' '),
  );
}
