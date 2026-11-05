import { WritableSignal, effect, signal } from '@angular/core';

const PREFIX = 'ictus.';

/** Turns stored JSON back into a value, or null when it doesn't fit (then the default is used). */
export type Parser<T> = (value: unknown) => T | null;

/** Reads a saved value; storage can be missing or blocked (private mode), so failures fall back to the default. */
export function loadValue<T>(key: string, fallback: T, parse: Parser<T>): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (parse(JSON.parse(raw)) ?? fallback);
  } catch {
    return fallback;
  }
}

export function saveValue(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app keeps working, the value just isn't remembered.
  }
}

/** A signal saved to localStorage the moment it changes. Call in an injection context. */
export function persistedSignal<T>(key: string, fallback: T, parse: Parser<T>): WritableSignal<T> {
  const state = signal(loadValue(key, fallback, parse));
  effect(() => saveValue(key, state()));
  return state;
}

/**
 * Merges a stored object over `defaults`, so values saved by an older version gain newer keys.
 * Keys whose stored type differs from the default's are dropped.
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
