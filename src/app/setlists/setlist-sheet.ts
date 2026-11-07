import { Component, inject, output, signal, viewChild } from '@angular/core';
import type { Piece, Setlist } from '../state/library.store';
import { LibraryStore, pieceSummary } from '../state/library.store';
import { MetronomeStore } from '../state/metronome.store';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Icon } from '../ui/icon';
import { Sheet } from '../ui/sheet';
import { Surface } from '../ui/surface';
import { NameDialog } from './name-dialog';

type Naming =
  | { kind: 'newSetlist'; initial: string }
  | { kind: 'renameSetlist'; setlistId: string; initial: string }
  /** Without a setlist, saving the first piece starts "Setlist 1". */
  | { kind: 'newPiece'; setlistId: string | null; initial: string };

/** Changes that can't be undone, asked about first. */
type Confirming =
  | { kind: 'deleteSetlist'; setlist: Setlist }
  | { kind: 'deletePiece'; setlist: Setlist; piece: Piece }
  | { kind: 'updatePiece'; setlist: Setlist; piece: Piece };

/** Setlists of saved pieces. Tap a piece to load it; save the current metronome as a new piece. */
@Component({
  selector: 'app-setlist-sheet',
  imports: [Sheet, ConfirmDialog, Icon, NameDialog, Surface],
  templateUrl: './setlist-sheet.html',
})
export class SetlistSheet {
  protected readonly library = inject(LibraryStore);
  protected readonly metronome = inject(MetronomeStore);
  readonly closed = output();

  protected readonly editing = signal(false);
  protected readonly naming = signal<Naming | null>(null);
  protected readonly confirming = signal<Confirming | null>(null);
  protected readonly summary = pieceSummary;
  private readonly sheet = viewChild.required(Sheet);

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

  protected newPiece(setlist: Setlist | null): void {
    this.naming.set({
      kind: 'newPiece',
      setlistId: setlist?.id ?? null,
      initial: `Piece ${(setlist?.pieces.length ?? 0) + 1}`,
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
        const setlistId = naming.setlistId ?? this.library.addSetlist('Setlist 1').id;
        const piece = this.library.addPiece(setlistId, name, this.metronome.setup());
        this.library.setActivePiece({ setlistId, pieceId: piece.id });
        break;
      }
    }
  }

  protected confirmText(confirming: Confirming): {
    title: string;
    message: string;
    action: string;
  } {
    switch (confirming.kind) {
      case 'deleteSetlist': {
        const count = confirming.setlist.pieces.length;
        return {
          title: `Delete “${confirming.setlist.name}”?`,
          message:
            count === 0
              ? 'The setlist is empty.'
              : `Its ${count === 1 ? 'piece is' : `${count} pieces are`} deleted too. This can't be undone.`,
          action: 'Delete',
        };
      }
      case 'deletePiece':
        return {
          title: `Delete “${confirming.piece.name}”?`,
          message: `It is removed from ${confirming.setlist.name}. This can't be undone.`,
          action: 'Delete',
        };
      case 'updatePiece':
        return {
          title: `Update “${confirming.piece.name}”?`,
          message: `It is saved with the current settings: ${pieceSummary({ ...confirming.piece, ...this.metronome.setup() })}. Its old settings are replaced.`,
          action: 'Update',
        };
    }
  }

  protected confirm(confirming: Confirming): void {
    switch (confirming.kind) {
      case 'deleteSetlist':
        this.library.deleteSetlist(confirming.setlist.id);
        break;
      case 'deletePiece':
        this.library.deletePiece(confirming.setlist.id, confirming.piece.id);
        break;
      case 'updatePiece':
        this.library.updatePiece(
          confirming.setlist.id,
          confirming.piece.id,
          this.metronome.setup(),
        );
        break;
    }
  }
}
