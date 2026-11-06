import { DestroyRef, Directive, inject, output } from '@angular/core';

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
    '(click)': 'onClick()',
    '(contextmenu)': '$event.preventDefault()',
  },
})
export class HoldRepeat {
  readonly repeat = output();

  private timer: ReturnType<typeof setTimeout> | undefined;
  private fromPointer = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.end();
    });
  }

  protected begin(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.fromPointer = true;
    this.repeat.emit();
    const tick = (): void => {
      this.repeat.emit();
      this.timer = setTimeout(tick, REPEAT_MS);
    };
    this.timer = setTimeout(tick, FIRST_DELAY_MS);
  }

  protected end(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  /** Keyboard activation (Enter / Space) arrives as a click without a pointer press. */
  protected onClick(): void {
    if (!this.fromPointer) this.repeat.emit();
    this.fromPointer = false;
  }
}
