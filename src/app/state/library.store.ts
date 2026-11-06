import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { canSwing, signatureLabel, subdivisionInfo } from '../music/meter';
import type { MetronomeSetup } from './metronome.store';
import { parseSetup } from './metronome.store';
import type { Parser } from './storage';
import { withPersistence } from './storage';

/** Tempo, meter, subdivision, swing and accents saved for one piece. */
export interface Piece extends MetronomeSetup {
  readonly id: string;
  readonly name: string;
}

export interface Setlist {
  readonly id: string;
  readonly name: string;
  readonly pieces: readonly Piece[];
}

export const pieceSummary = (piece: Piece): string => {
  const swung = piece.swing > 0.5 && canSwing(piece.subdivision) ? ' swing' : '';
  return `${piece.bpm} BPM · ${signatureLabel(piece.timeSignature)} · ${subdivisionInfo(piece.subdivision).symbol}${swung}`;
};

/** A saved object with an id and a name; everything else still has to be checked. */
interface Named {
  readonly id: string;
  readonly name: string;
  readonly [key: string]: unknown;
}

function isNamed(item: unknown): item is Named {
  if (typeof item !== 'object' || item === null) return false;
  const { id, name } = item as Partial<Record<'id' | 'name', unknown>>;
  return typeof id === 'string' && typeof name === 'string';
}

const parseSetlists: Parser<Setlist[]> = (value) => {
  if (!Array.isArray(value)) return null;
  return (value as unknown[]).filter(isNamed).map((setlist) => {
    const pieces: unknown[] = Array.isArray(setlist['pieces']) ? setlist['pieces'] : [];
    return {
      id: setlist.id,
      name: setlist.name,
      // One damaged piece must not take the whole library down with it.
      pieces: pieces.filter(isNamed).flatMap((piece) => {
        const setup = parseSetup(piece);
        return setup ? [{ ...setup, id: piece.id, name: piece.name }] : [];
      }),
    };
  });
};

interface ActivePiece {
  readonly setlistId: string;
  readonly pieceId: string;
}

interface LibraryState {
  readonly setlists: readonly Setlist[];
  /** The piece last loaded into the metronome, for previous / next navigation. */
  readonly activePiece: ActivePiece | null;
}

/** Setlists of saved pieces, stored in localStorage. */
export const LibraryStore = signalStore(
  { providedIn: 'root' },
  withState<LibraryState>({ setlists: [], activePiece: null }),
  withPersistence<LibraryState>(
    'setlists',
    (value) => {
      const setlists = parseSetlists(value);
      return setlists ? { setlists } : null;
    },
    (state) => state.setlists,
  ),
  withComputed(({ setlists, activePiece }) => {
    const activeSetlist = computed(() => {
      const active = activePiece();
      return active
        ? (setlists().find((setlist) => setlist.id === active.setlistId) ?? null)
        : null;
    });
    return {
      activeSetlist,
      /** Position of the active piece within its setlist. */
      activePosition: computed(() => {
        const setlist = activeSetlist();
        const index =
          setlist?.pieces.findIndex((piece) => piece.id === activePiece()?.pieceId) ?? -1;
        const piece = setlist?.pieces[index];
        return setlist && piece ? { index, count: setlist.pieces.length, piece, setlist } : null;
      }),
    };
  }),
  withMethods((store) => {
    const updateSetlist = (id: string, change: (setlist: Setlist) => Setlist): void => {
      patchState(store, ({ setlists }) => ({
        setlists: setlists.map((setlist) => (setlist.id === id ? change(setlist) : setlist)),
      }));
    };

    return {
      setActivePiece(activePiece: ActivePiece | null): void {
        patchState(store, { activePiece });
      },

      // MARK: Setlists

      addSetlist(name: string): Setlist {
        const setlist: Setlist = { id: crypto.randomUUID(), name, pieces: [] };
        patchState(store, ({ setlists }) => ({ setlists: [...setlists, setlist] }));
        return setlist;
      },

      renameSetlist(id: string, name: string): void {
        updateSetlist(id, (setlist) => ({ ...setlist, name }));
      },

      deleteSetlist(id: string): void {
        patchState(store, ({ setlists, activePiece }) => ({
          setlists: setlists.filter((setlist) => setlist.id !== id),
          activePiece: activePiece?.setlistId === id ? null : activePiece,
        }));
      },

      // MARK: Pieces

      addPiece(setlistId: string, name: string, setup: MetronomeSetup): Piece {
        const piece: Piece = { ...setup, id: crypto.randomUUID(), name };
        updateSetlist(setlistId, (setlist) => ({ ...setlist, pieces: [...setlist.pieces, piece] }));
        return piece;
      },

      updatePiece(setlistId: string, pieceId: string, setup: MetronomeSetup): void {
        updateSetlist(setlistId, (setlist) => ({
          ...setlist,
          pieces: setlist.pieces.map((piece) =>
            piece.id === pieceId ? { ...setup, id: piece.id, name: piece.name } : piece,
          ),
        }));
      },

      deletePiece(setlistId: string, pieceId: string): void {
        updateSetlist(setlistId, (setlist) => ({
          ...setlist,
          pieces: setlist.pieces.filter((piece) => piece.id !== pieceId),
        }));
        if (store.activePiece()?.pieceId === pieceId) patchState(store, { activePiece: null });
      },

      movePiece(setlistId: string, pieceId: string, offset: number): void {
        updateSetlist(setlistId, (setlist) => {
          const pieces = [...setlist.pieces];
          const from = pieces.findIndex((piece) => piece.id === pieceId);
          const to = from + offset;
          if (from < 0 || to < 0 || to >= pieces.length) return setlist;
          const [piece] = pieces.splice(from, 1);
          if (!piece) return setlist;
          pieces.splice(to, 0, piece);
          return { ...setlist, pieces };
        });
      },

      // MARK: Navigation

      /** The piece `offset` steps from the active one, which becomes active. */
      step(offset: number): Piece | null {
        const position = store.activePosition();
        if (!position) return null;
        const piece = position.setlist.pieces[position.index + offset];
        if (!piece) return null;
        patchState(store, { activePiece: { setlistId: position.setlist.id, pieceId: piece.id } });
        return piece;
      },
    };
  }),
);
