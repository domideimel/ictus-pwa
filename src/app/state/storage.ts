import type { WritableSignal } from '@angular/core';
import { effect, linkedSignal, untracked } from '@angular/core';
import { withStorageSync } from '@ngrx-toolkit/core';
import type { EmptyFeatureResult } from '@ngrx/signals';

const PREFIX = 'ictus.';

/** Turns stored JSON back into a value, or null when it doesn't fit (then the default is used). */
export type Parser<T> = (value: unknown) => T | null;

/**
 * Saves the store state (or the part `select` picks) to localStorage on every change and restores it on
 * startup. Values that fail to parse are dropped, so the store keeps its initial state.
 */
export function withPersistence<State extends object>(
  key: string,
  parse: Parser<Partial<State>>,
  select: (state: State) => unknown = (state) => state,
): ReturnType<typeof withStorageSync<EmptyFeatureResult & { state: State }>> {
  return withStorageSync<EmptyFeatureResult & { state: State }>({
    key: PREFIX + key,
    select,
    parse: (stored: string) => {
      try {
        return (parse(JSON.parse(stored)) ?? {}) as State;
      } catch {
        return {} as State;
      }
    },
  });
}

/**
 * A writable copy of store state for signal forms, which need a `WritableSignal`.
 * Form edits are written back with `write`; store changes flow into the copy. Call in an injection context.
 */
export function writableState<T>(source: () => T, write: (value: T) => void): WritableSignal<T> {
  const model = linkedSignal(source);
  effect(() => {
    const value = model();
    untracked(() => {
      write(value);
    });
  });
  return model;
}

/**
 * Merges a stored object over `defaults`, so values saved by an older version gain newer keys.
 * Keys whose stored type differs from the default's, or that no longer exist, are dropped.
 */
export function withDefaults<T extends object>(defaults: T): Parser<T> {
  return (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const merged: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
    for (const [key, expected] of Object.entries(defaults)) {
      const stored = (value as Record<string, unknown>)[key];
      const sameType = Array.isArray(expected)
        ? Array.isArray(stored)
        : typeof stored === typeof expected;
      if (stored !== undefined && sameType) merged[key] = stored;
    }
    return merged as T;
  };
}
