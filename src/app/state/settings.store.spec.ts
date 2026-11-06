import { TestBed } from '@angular/core/testing';
import { getState } from '@ngrx/signals';
import { DEFAULT_SETTINGS, PEDAL_MODES, SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('starts with the defaults: A = 442, bass clef, flats', () => {
    const store = TestBed.inject(SettingsStore);
    expect(getState(store)).toEqual(DEFAULT_SETTINGS);
    expect(store.referencePitch()).toBe(442);
    expect(store.clef()).toBe('bass');
    expect(store.accidentals()).toBe('flats');
  });

  it('updates and saves individual settings', () => {
    const store = TestBed.inject(SettingsStore);
    store.update({ tolerance: 10, clickSound: 'cowbell' });
    TestBed.tick();
    expect(store.tolerance()).toBe(10);
    TestBed.resetTestingModule();
    expect(TestBed.inject(SettingsStore).clickSound()).toBe('cowbell');
  });

  it('adds settings introduced later to an older saved copy', () => {
    const { polyVolume: _, ...older } = DEFAULT_SETTINGS;
    localStorage.setItem('ictus.settings', JSON.stringify({ ...older, beatVolume: 0.2 }));
    const store = TestBed.inject(SettingsStore);
    expect(store.beatVolume()).toBe(0.2);
    expect(store.polyVolume()).toBe(DEFAULT_SETTINGS.polyVolume);
  });

  it('exposes the same values to forms', () => {
    const store = TestBed.inject(SettingsStore);
    expect(store.editable()).toEqual(DEFAULT_SETTINGS);
    store.update({ drumLugs: 10 });
    expect(store.editable().drumLugs).toBe(10);
  });

  it('labels both pedal modes', () => {
    expect(PEDAL_MODES.map((mode) => mode.value)).toEqual(['tapAndStartStop', 'previousAndNext']);
  });
});
