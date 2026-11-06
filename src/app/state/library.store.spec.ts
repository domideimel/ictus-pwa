import { TestBed } from '@angular/core/testing';
import { BeatLevel, defaultLevels } from '../music/meter';
import type { Piece } from './library.store';
import { LibraryStore, pieceSummary } from './library.store';
import type { MetronomeSetup } from './metronome.store';

const setup: MetronomeSetup = {
  bpm: 90,
  timeSignature: { beats: 4, unit: 4 },
  grouping: [4],
  levels: defaultLevels(4),
  subdivision: 1,
  swing: 0.5,
};

describe('LibraryStore', () => {
  let store: InstanceType<typeof LibraryStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    store = TestBed.inject(LibraryStore);
  });

  const names = (setlistId: string): string[] =>
    store
      .setlists()
      .find((setlist) => setlist.id === setlistId)!
      .pieces.map((piece) => piece.name);

  it('adds, renames and deletes setlists', () => {
    const concert = store.addSetlist('Concert');
    const rehearsal = store.addSetlist('Rehearsal');
    store.renameSetlist(concert.id, 'Gala');
    expect(store.setlists().map((setlist) => setlist.name)).toEqual(['Gala', 'Rehearsal']);
    store.deleteSetlist(rehearsal.id);
    expect(store.setlists().map((setlist) => setlist.name)).toEqual(['Gala']);
  });

  it('adds, updates and deletes pieces', () => {
    const list = store.addSetlist('Concert');
    const one = store.addPiece(list.id, 'One', setup);
    store.addPiece(list.id, 'Two', setup);
    store.updatePiece(list.id, one.id, { ...setup, bpm: 132 });
    const updated = store.setlists()[0]!.pieces[0];
    expect(updated).toEqual(expect.objectContaining({ id: one.id, name: 'One', bpm: 132 }));
    store.deletePiece(list.id, one.id);
    expect(names(list.id)).toEqual(['Two']);
  });

  it('moves pieces up and down within bounds', () => {
    const list = store.addSetlist('Concert');
    const [a, , c] = ['A', 'B', 'C'].map((name) => store.addPiece(list.id, name, setup)) as [
      Piece,
      Piece,
      Piece,
    ];
    store.movePiece(list.id, c.id, -1);
    expect(names(list.id)).toEqual(['A', 'C', 'B']);
    store.movePiece(list.id, a.id, -1);
    store.movePiece(list.id, c.id, 5);
    expect(names(list.id)).toEqual(['A', 'C', 'B']);
    store.movePiece(list.id, 'missing', 1);
    expect(names(list.id)).toEqual(['A', 'C', 'B']);
  });

  it('tracks the active piece and its position', () => {
    const list = store.addSetlist('Concert');
    store.addPiece(list.id, 'One', setup);
    const two = store.addPiece(list.id, 'Two', setup);
    expect(store.activePosition()).toBeNull();
    store.setActivePiece({ setlistId: list.id, pieceId: two.id });
    expect(store.activePosition()).toEqual(
      expect.objectContaining({
        index: 1,
        count: 2,
        piece: expect.objectContaining({ name: 'Two' }),
      }),
    );
    expect(store.activeSetlist()?.name).toBe('Concert');
  });

  it('steps through the active setlist and stops at the ends', () => {
    const list = store.addSetlist('Concert');
    const one = store.addPiece(list.id, 'One', setup);
    store.addPiece(list.id, 'Two', setup);
    expect(store.step(1)).toBeNull();
    store.setActivePiece({ setlistId: list.id, pieceId: one.id });
    expect(store.step(-1)).toBeNull();
    expect(store.step(1)?.name).toBe('Two');
    expect(store.step(1)).toBeNull();
    expect(store.activePosition()?.index).toBe(1);
  });

  it('forgets the active piece when it or its setlist is deleted', () => {
    const list = store.addSetlist('Concert');
    const piece = store.addPiece(list.id, 'One', setup);
    store.setActivePiece({ setlistId: list.id, pieceId: piece.id });
    store.deletePiece(list.id, piece.id);
    expect(store.activePiece()).toBeNull();

    const again = store.addPiece(list.id, 'Two', setup);
    store.setActivePiece({ setlistId: list.id, pieceId: again.id });
    store.deleteSetlist(list.id);
    expect(store.activePiece()).toBeNull();
  });

  it('keeps the active piece when another one is deleted', () => {
    const list = store.addSetlist('Concert');
    const one = store.addPiece(list.id, 'One', setup);
    const two = store.addPiece(list.id, 'Two', setup);
    store.setActivePiece({ setlistId: list.id, pieceId: one.id });
    store.deletePiece(list.id, two.id);
    expect(store.activePiece()?.pieceId).toBe(one.id);
  });

  it('drops broken entries and repairs pieces when loading', () => {
    localStorage.setItem(
      'ictus.setlists',
      JSON.stringify([
        {
          id: 's1',
          name: 'Saved',
          pieces: [
            { id: 'p1', name: 'Old', bpm: 1000, timeSignature: { beats: 3, unit: 4 } },
            { name: 'No id' },
          ],
        },
        { name: 'No id' },
        { id: 's2', name: 'No pieces' },
      ]),
    );
    TestBed.resetTestingModule();
    const loaded = TestBed.inject(LibraryStore).setlists();
    expect(loaded.map((setlist) => setlist.name)).toEqual(['Saved', 'No pieces']);
    expect(loaded[0]!.pieces).toEqual([
      expect.objectContaining({ id: 'p1', bpm: 300, grouping: [3], swing: 0.5 }),
    ]);
    expect(loaded[0]!.pieces[0]!.levels).toEqual([
      BeatLevel.Accent,
      BeatLevel.Normal,
      BeatLevel.Normal,
    ]);
    expect(loaded[1]!.pieces).toEqual([]);
  });

  it('ignores a saved value that is not a list', () => {
    localStorage.setItem('ictus.setlists', JSON.stringify({ not: 'a list' }));
    TestBed.resetTestingModule();
    expect(TestBed.inject(LibraryStore).setlists()).toEqual([]);
  });
});

describe('pieceSummary', () => {
  const piece = (changes: Partial<Piece>): Piece => ({ ...setup, id: 'p', name: 'P', ...changes });

  it('shows tempo, meter and subdivision', () => {
    expect(pieceSummary(piece({}))).toBe('90 BPM · 4/4 · ♩');
  });

  it('mentions swing only where it applies', () => {
    expect(pieceSummary(piece({ subdivision: 2, swing: 0.66 }))).toBe('90 BPM · 4/4 · ♫ swing');
    expect(pieceSummary(piece({ subdivision: 3, swing: 0.66 }))).toBe('90 BPM · 4/4 · ♪♪♪');
  });
});
