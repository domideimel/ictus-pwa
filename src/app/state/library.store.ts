import { Service, computed, signal } from '@angular/core';
import { canSwing, signatureLabel, subdivisionInfo } from '../music/meter';
import { MetronomeSetup, sanitizeSetup } from './metronome.store';
import { Parser, persistedSignal } from './storage';

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

const parseSetlists: Parser<Setlist[]> = (value) => {
  if (!Array.isArray(value)) return null;
  return value
    .filter(
      (item): item is Setlist => typeof item?.id === 'string' && typeof item?.name === 'string',
    )
    .map((setlist) => ({
      id: setlist.id,
      name: setlist.name,
      pieces: (Array.isArray(setlist.pieces) ? setlist.pieces : [])
        .filter((piece) => typeof piece?.id === 'string' && typeof piece?.name === 'string')
        .map((piece) => ({
          ...sanitizeSetup({ swing: 0.5, ...piece }),
          id: piece.id,
          name: piece.name,
        })),
    }));
};

/** Setlists of saved pieces, stored in localStorage. */
@Service()
export class LibraryStore {
  readonly setlists = persistedSignal<Setlist[]>('setlists', [], parseSetlists);

  /** The piece last loaded into the metronome, for previous / next navigation. */
  readonly activePiece = signal<{ setlistId: string; pieceId: string } | null>(null);

  readonly activeSetlist = computed(() => {
    const active = this.activePiece();
    return active
      ? (this.setlists().find((setlist) => setlist.id === active.setlistId) ?? null)
      : null;
  });

  /** Position of the active piece within its setlist. */
  readonly activePosition = computed(() => {
    const setlist = this.activeSetlist();
    const index =
      setlist?.pieces.findIndex((piece) => piece.id === this.activePiece()?.pieceId) ?? -1;
    return setlist && index >= 0
      ? { index, count: setlist.pieces.length, piece: setlist.pieces[index], setlist }
      : null;
  });

  // MARK: Setlists

  addSetlist(name: string): Setlist {
    const setlist: Setlist = { id: crypto.randomUUID(), name, pieces: [] };
    this.setlists.update((all) => [...all, setlist]);
    return setlist;
  }

  renameSetlist(id: string, name: string): void {
    this.updateSetlist(id, (setlist) => ({ ...setlist, name }));
  }

  deleteSetlist(id: string): void {
    this.setlists.update((all) => all.filter((setlist) => setlist.id !== id));
    if (this.activePiece()?.setlistId === id) this.activePiece.set(null);
  }

  // MARK: Pieces

  addPiece(setlistId: string, name: string, setup: MetronomeSetup): Piece {
    const piece: Piece = { ...setup, id: crypto.randomUUID(), name };
    this.updateSetlist(setlistId, (setlist) => ({
      ...setlist,
      pieces: [...setlist.pieces, piece],
    }));
    return piece;
  }

  updatePiece(setlistId: string, pieceId: string, setup: MetronomeSetup): void {
    this.updateSetlist(setlistId, (setlist) => ({
      ...setlist,
      pieces: setlist.pieces.map((piece) =>
        piece.id === pieceId ? { ...setup, id: piece.id, name: piece.name } : piece,
      ),
    }));
  }

  deletePiece(setlistId: string, pieceId: string): void {
    this.updateSetlist(setlistId, (setlist) => ({
      ...setlist,
      pieces: setlist.pieces.filter((piece) => piece.id !== pieceId),
    }));
    if (this.activePiece()?.pieceId === pieceId) this.activePiece.set(null);
  }

  movePiece(setlistId: string, pieceId: string, offset: number): void {
    this.updateSetlist(setlistId, (setlist) => {
      const pieces = [...setlist.pieces];
      const from = pieces.findIndex((piece) => piece.id === pieceId);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= pieces.length) return setlist;
      const [piece] = pieces.splice(from, 1);
      pieces.splice(to, 0, piece);
      return { ...setlist, pieces };
    });
  }

  // MARK: Navigation

  /** The piece `offset` steps from the active one, which becomes active. */
  step(offset: number): Piece | null {
    const position = this.activePosition();
    if (!position) return null;
    const piece = position.setlist.pieces[position.index + offset];
    if (!piece) return null;
    this.activePiece.set({ setlistId: position.setlist.id, pieceId: piece.id });
    return piece;
  }

  private updateSetlist(id: string, change: (setlist: Setlist) => Setlist): void {
    this.setlists.update((all) =>
      all.map((setlist) => (setlist.id === id ? change(setlist) : setlist)),
    );
  }
}
