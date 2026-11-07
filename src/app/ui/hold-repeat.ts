import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

const FIRST_DELAY_MS = 400;
const REPEAT_MS = 80;

/** Fires `repeat` on press and keeps firing while the button is held, like the native ±BPM buttons. */
@Directive({
  selector: 'button[appHoldRepeat]',
  host: {
    '(pointerdown)': 'begin($event)',
    '(pointerup)': 'end()',
    '(pointercancel)': 'end()',
    '(pointerleave)': 'end()',
    '(click)': 'onClick($event)',
    '(contextmenu)': '$event.preventDefault()',
  },
})
export class HoldRepeat {
  private readonly button = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;
  readonly repeat = output();

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.end();
    });
  }

  protected begin(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.repeat.emit();
    const tick = (): void => {
      // Held up to the limit: the button is disabled now and may never see the pointer go up.
      if (this.button.disabled) {
        this.end();
        return;
      }
      this.repeat.emit();
      this.timer = setTimeout(tick, REPEAT_MS);
    };
    this.timer = setTimeout(tick, FIRST_DELAY_MS);
  }

  protected end(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  /**
   * Keyboard activation (Enter / Space) and assistive tech arrive as a click with `detail` 0 and no
   * press before it; a click after a pointer press has `detail` 1 or more and was already counted.
   */
  protected onClick(event: MouseEvent): void {
    if (event.detail === 0) this.repeat.emit();
  }
}
