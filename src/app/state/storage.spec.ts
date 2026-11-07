import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { getState, patchState, signalStore, withState } from '@ngrx/signals';
import { oneOf, withDefaults, withPersistence, writableState } from './storage';

describe('withDefaults', () => {
  const parse = withDefaults({ count: 1, name: 'a', on: false, list: [1] });

  it('keeps stored values of the right type', () => {
    expect(parse({ count: 5, name: 'b', on: true, list: [2, 3] })).toEqual({
      count: 5,
      name: 'b',
      on: true,
      list: [2, 3],
    });
  });

  it('fills in missing keys and drops unknown or mistyped ones', () => {
    expect(parse({ count: '5', extra: 1, list: { 0: 1 } })).toEqual({
      count: 1,
      name: 'a',
      on: false,
      list: [1],
    });
  });

  it('rejects anything that is not an object', () => {
    for (const value of [null, undefined, 3, 'text', [1, 2]]) expect(parse(value)).toBeNull();
  });
});

describe('oneOf', () => {
  it('keeps a known option and falls back otherwise', () => {
    const sounds = ['click', 'woodblock'] as const;
    expect(oneOf(sounds, 'woodblock', 'click')).toBe('woodblock');
    expect(oneOf(sounds, 'bell', 'click')).toBe('click');
    expect(oneOf(sounds, 3, 'click')).toBe('click');
  });
});

describe('writableState', () => {
  it('writes form edits back and follows changes from the source', () => {
    const source = signal({ value: 1 });
    const writes: number[] = [];
    const model = TestBed.runInInjectionContext(() =>
      writableState(source, (next) => {
        writes.push(next.value);
        source.set(next);
      }),
    );
    TestBed.tick();
    model.set({ value: 2 });
    TestBed.tick();
    expect(source().value).toBe(2);

    source.set({ value: 3 });
    expect(model().value).toBe(3);
    expect(writes).toContain(2);
  });
});

describe('withPersistence', () => {
  const Store = signalStore(
    { providedIn: 'root', protectedState: false },
    withState({ count: 0, label: 'x', session: 1 }),
    withPersistence<{ count: number; label: string; session: number }>(
      'test',
      (value) => withDefaults({ count: 0, label: 'x' })(value),
      ({ count, label }) => ({ count, label }),
    ),
  );

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('saves the selected part of the state under the ictus prefix', () => {
    const store = TestBed.inject(Store);
    patchState(store, { count: 4, session: 9 });
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('ictus.test') ?? 'null')).toEqual({
      count: 4,
      label: 'x',
    });
  });

  it('restores saved state on the next launch', () => {
    localStorage.setItem('ictus.test', JSON.stringify({ count: 7, label: 'y' }));
    expect(getState(TestBed.inject(Store))).toEqual(
      expect.objectContaining({ count: 7, label: 'y' }),
    );
  });

  it('takes over what another tab saved, so neither overwrites the other', () => {
    const store = TestBed.inject(Store);
    const saved = JSON.stringify({ count: 3, label: 'other tab' });
    localStorage.setItem('ictus.test', saved);
    window.dispatchEvent(new StorageEvent('storage', { key: 'ictus.test', newValue: saved }));
    expect(getState(store)).toEqual({ count: 3, label: 'other tab', session: 1 });

    // Other keys, and clearing the storage, leave the state alone.
    window.dispatchEvent(new StorageEvent('storage', { key: 'ictus.other', newValue: '{}' }));
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null }));
    expect(getState(store).count).toBe(3);
  });

  it('stops listening to other tabs when destroyed', () => {
    const store = TestBed.inject(Store);
    TestBed.resetTestingModule();
    const saved = JSON.stringify({ count: 8, label: 'z' });
    localStorage.setItem('ictus.test', saved);
    window.dispatchEvent(new StorageEvent('storage', { key: 'ictus.test', newValue: saved }));
    expect(getState(store).count).toBe(0);
  });

  it('keeps the initial state when the saved value is unreadable', () => {
    localStorage.setItem('ictus.test', 'not json');
    expect(getState(TestBed.inject(Store))).toEqual({ count: 0, label: 'x', session: 1 });
    localStorage.setItem('ictus.test', '42');
    TestBed.resetTestingModule();
    expect(getState(TestBed.inject(Store))).toEqual({ count: 0, label: 'x', session: 1 });
  });
});
