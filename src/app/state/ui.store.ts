import { Service, signal } from '@angular/core';

/** Sheets opened from more than one screen. */
@Service()
export class UiStore {
  readonly showSettings = signal(false);
}
