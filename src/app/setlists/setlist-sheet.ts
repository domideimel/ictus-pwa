import { Component, inject, output, signal, viewChild } from '@angular/core';
import type { Piece, Setlist } from '../state/library.store';
import { LibraryStore, pieceSummary } from '../state/library.store';
import { MetronomeStore } from '../state/metronome.store';
import { Icon } from '../ui/icon';
import { Sheet } from '../ui/sheet';
import { Surface } from '../ui/surface';
import { NameDialog } from './name-dialog';

type Naming =
  | { kind: 'newSetlist'; initial: string }
  | { kind: 'renameSetlist'; setlistId: string; initial: string }
  | { kind: 'newPiece'; setlistId: string; initial: string };

/** Setlists of saved pieces. Tap a piece to load it; save the current metronome as a new piece. */
@Component({
  selector: 'app-setlist-sheet',
  imports: [Sheet, Icon, NameDialog, Surface],
  templateUrl: './setlist-sheet.html',
})
export class SetlistSheet {
  protected readonly library = inject(LibraryStore);
  protected readonly metronome = inject(MetronomeStore);
  readonly closed = output();

  protected readonly editing = signal(false);
  protected readonly naming = signal<Naming | null>(null);
  protected readonly summary = pieceSummary;
  private readonly sheet = viewChild.required(Sheet);

  constructor() {
    if (this.library.setlists().length === 0) this.library.addSetlist('Setlist 1');
  }

  protected load(setlist: Setlist, piece: Piece): void {
    if (this.editing()) return;
    this.metronome.apply(piece);
    this.library.setActivePiece({ setlistId: setlist.id, pieceId: piece.id });
    this.sheet().close();
  }

  protected newSetlist(): void {
    this.naming.set({
      kind: 'newSetlist',
      initial: `Setlist ${this.library.setlists().length + 1}`,
    });
  }

  protected rename(setlist: Setlist): void {
    this.naming.set({ kind: 'renameSetlist', setlistId: setlist.id, initial: setlist.name });
  }

  protected newPiece(setlist: Setlist): void {
    this.naming.set({
      kind: 'newPiece',
      setlistId: setlist.id,
      initial: `Piece ${setlist.pieces.length + 1}`,
    });
  }

  protected namingTitle(naming: Naming): string {
    return naming.kind === 'newSetlist'
      ? 'New setlist'
      : naming.kind === 'renameSetlist'
        ? 'Rename setlist'
        : 'Save piece';
  }

  protected commit(naming: Naming, name: string): void {
    switch (naming.kind) {
      case 'newSetlist':
        this.library.addSetlist(name);
        break;
      case 'renameSetlist':
        this.library.renameSetlist(naming.setlistId, name);
        break;
      case 'newPiece': {
        const piece = this.library.addPiece(naming.setlistId, name, this.metronome.setup());
        this.library.setActivePiece({ setlistId: naming.setlistId, pieceId: piece.id });
        break;
      }
    }
  }
}
