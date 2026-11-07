/**
 * The option an arrow, Home or End key selects in a radio group of `count` options, as in a native
 * radio group (the arrows wrap around); null for any other key.
 */
export function radioKeyTarget(key: string, index: number, count: number): number | null {
  const current = Math.max(index, 0);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** Moves focus to the radio button at `index` inside the group that handled the key. */
export function focusRadio(event: KeyboardEvent, index: number): void {
  const group = event.currentTarget as HTMLElement;
  group.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
}
