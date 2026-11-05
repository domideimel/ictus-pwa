import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

/** Sheets opened from more than one screen. */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState({ showSettings: false }),
  withMethods((store) => ({
    openSettings(): void {
      patchState(store, { showSettings: true });
    },
    closeSettings(): void {
      patchState(store, { showSettings: false });
    },
  })),
);
