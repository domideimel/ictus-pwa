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
  template: `
    <app-sheet title="Setlists" (closed)="closed.emit()">
      <button
        sheetAccessory
        type="button"
        appSurface
        pressed
        class="h-11 rounded-full px-4 text-[15px]"
        [selected]="editing()"
        (click)="editing.set(!editing())"
      >
        {{ editing() ? 'Finish' : 'Edit' }}
      </button>

      <div class="flex flex-col gap-5">
        @for (setlist of library.setlists(); track setlist.id) {
          <section class="flex flex-col gap-1.5" [attr.aria-label]="setlist.name">
            <div class="flex items-center justify-between ps-1 text-muted">
              <h3 class="text-xs uppercase tracking-[0.08em]">{{ setlist.name }}</h3>
              @if (editing()) {
                <div class="flex">
                  <button
                    type="button"
                    class="flex size-11 items-center justify-center"
                    [attr.aria-label]="'Rename ' + setlist.name"
                    (click)="rename(setlist)"
                  >
                    <app-icon name="pencil" [size]="18" />
                  </button>
                  <button
                    type="button"
                    class="flex size-11 items-center justify-center"
                    [attr.aria-label]="'Delete ' + setlist.name"
                    (click)="library.deleteSetlist(setlist.id)"
                  >
                    <app-icon name="trash" [size]="18" />
                  </button>
                </div>
              }
            </div>
            <ul class="flex flex-col overflow-hidden rounded-[14px] bg-surface">
              @for (piece of setlist.pieces; track piece.id; let first = $first, last = $last) {
                @let active = library.activePiece()?.pieceId === piece.id;
                <li class="flex min-h-14 items-center border-b border-stroke">
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-4 py-2 text-start"
                    (click)="load(setlist, piece)"
                  >
                    <span class="font-semibold" [class.text-accent-text]="active">{{
                      piece.name
                    }}</span>
                    <span class="text-[13px] text-muted tabular">{{ summary(piece) }}</span>
                  </button>
                  @if (editing()) {
                    <div class="flex pe-1 text-muted">
                      <button
                        type="button"
                        class="flex size-11 items-center justify-center disabled:opacity-30"
                        [disabled]="first"
                        [attr.aria-label]="'Move ' + piece.name + ' up'"
                        (click)="library.movePiece(setlist.id, piece.id, -1)"
                      >
                        <app-icon name="arrow-up" [size]="18" />
                      </button>
                      <button
                        type="button"
                        class="flex size-11 items-center justify-center disabled:opacity-30"
                        [disabled]="last"
                        [attr.aria-label]="'Move ' + piece.name + ' down'"
                        (click)="library.movePiece(setlist.id, piece.id, 1)"
                      >
                        <app-icon name="arrow-down" [size]="18" />
                      </button>
                      <button
                        type="button"
                        class="flex size-11 items-center justify-center"
                        [attr.aria-label]="'Update ' + piece.name + ' with current settings'"
                        (click)="library.updatePiece(setlist.id, piece.id, metronome.setup())"
                      >
                        <app-icon name="refresh" [size]="18" />
                      </button>
                      <button
                        type="button"
                        class="flex size-11 items-center justify-center"
                        [attr.aria-label]="'Delete ' + piece.name"
                        (click)="library.deletePiece(setlist.id, piece.id)"
                      >
                        <app-icon name="trash" [size]="18" />
                      </button>
                    </div>
                  } @else if (active) {
                    <app-icon name="check" class="pe-4 text-accent-text" [size]="20" />
                    <span class="sr-only">Loaded</span>
                  }
                </li>
              }
              <li>
                <button
                  type="button"
                  class="flex min-h-12 w-full items-center gap-2 px-4 text-[15px] font-semibold text-accent-text"
                  (click)="newPiece(setlist)"
                >
                  <app-icon name="plus" [size]="20" [strokeWidth]="2.2" />
                  Save current as piece
                </button>
              </li>
            </ul>
          </section>
        }

        <button
          type="button"
          class="flex min-h-12 items-center gap-2 rounded-[14px] bg-surface px-4 text-[15px] font-semibold"
          (click)="newSetlist()"
        >
          <app-icon name="setlist" [size]="20" />
          New setlist
        </button>
        <p class="px-1 text-xs text-muted">
          A piece saves tempo, meter, grouping, accents, subdivision and swing. Edit to reorder,
          update or delete.
        </p>
      </div>
    </app-sheet>

    @if (naming(); as naming) {
      <app-name-dialog
        [title]="namingTitle(naming)"
        [initialName]="naming.initial"
        (saved)="commit(naming, $event)"
        (closed)="this.naming.set(null)"
      />
    }
  `,
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
