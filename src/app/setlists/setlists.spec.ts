import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { byLabel, click, queryAllText, render } from '../../testing/dom';
import { defaultLevels } from '../music/meter';
import { LibraryStore } from '../state/library.store';
import type { MetronomeSetup } from '../state/metronome.store';
import { MetronomeStore } from '../state/metronome.store';
import { NameDialog } from './name-dialog';
import { SetlistBar } from './setlist-bar';
import { SetlistSheet } from './setlist-sheet';

const setup = (bpm: number): MetronomeSetup => ({
  bpm,
  timeSignature: { beats: 3, unit: 4 },
  grouping: [3],
  pulse: 'unit',
  levels: defaultLevels(3),
  subdivision: 1,
  swing: 0.5,
});

let library: InstanceType<typeof LibraryStore>;
let metronome: InstanceType<typeof MetronomeStore>;

beforeEach(() => {
  localStorage.clear();
  TestBed.resetTestingModule();
  library = TestBed.inject(LibraryStore);
  metronome = TestBed.inject(MetronomeStore);
});

function concert() {
  const list = library.addSetlist('Concert');
  const pieces = [60, 90, 120].map((bpm, i) =>
    library.addPiece(list.id, `Piece ${i + 1}`, setup(bpm)),
  );
  return { list, pieces };
}

const typeName = (dialog: HTMLElement, value: string): void => {
  const input = dialog.querySelector('input')!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('SetlistBar', () => {
  it('stays hidden until a piece is loaded', async () => {
    concert();
    const { element } = await render(SetlistBar);
    expect(element.querySelector('button')).toBeNull();
  });

  it('shows the piece and steps through the setlist', async () => {
    const { list, pieces } = concert();
    library.setActivePiece({ setlistId: list.id, pieceId: pieces[0]!.id });
    const { fixture, element } = await render(SetlistBar);
    expect(element.textContent).toContain('Piece 1');
    expect(element.textContent).toContain('1 of 3 · Concert');
    expect((byLabel(element, 'Previous piece') as HTMLButtonElement).disabled).toBe(true);

    await click(fixture, byLabel(element, 'Next piece'));
    expect(metronome.bpm()).toBe(90);
    expect(metronome.timeSignature()).toEqual({ beats: 3, unit: 4 });
    await click(fixture, byLabel(element, 'Next piece'));
    expect((byLabel(element, 'Next piece') as HTMLButtonElement).disabled).toBe(true);
    await click(fixture, byLabel(element, 'Previous piece'));
    expect(metronome.bpm()).toBe(90);
  });

  it('opens the setlists from the piece name', async () => {
    const { list, pieces } = concert();
    library.setActivePiece({ setlistId: list.id, pieceId: pieces[1]!.id });
    const { fixture, element } = await render(SetlistBar);
    let opened = false;
    fixture.componentInstance.open.subscribe(() => (opened = true));
    await click(fixture, element.querySelector('[aria-haspopup="dialog"]') as HTMLElement);
    expect(opened).toBe(true);
  });
});

@Component({
  imports: [NameDialog],
  template: `
    @if (open()) {
      <app-name-dialog
        title="Save piece"
        initialName="Piece 1"
        (saved)="saved.push($event)"
        (closed)="open.set(false)"
      />
    }
  `,
})
class NameHost {
  readonly open = signal(true);
  readonly saved: string[] = [];
}

describe('NameDialog', () => {
  it('opens with the suggested name selected', async () => {
    const { element } = await render(NameHost);
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe('Save piece');
    const input = dialog.querySelector('input')!;
    expect(input.value).toBe('Piece 1');
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 7]);
  });

  it('saves a trimmed name and closes', async () => {
    const { fixture, element } = await render(NameHost);
    const dialog = element.querySelector('dialog')!;
    typeName(dialog, '  Bolero  ');
    await click(fixture, byLabel(dialog, 'Save'));
    await fixture.whenStable();
    expect(fixture.componentInstance.saved).toEqual(['Bolero']);
    expect(element.querySelector('dialog')).toBeNull();
  });

  it.each([
    ['', 'Enter a name.'],
    ['   ', 'Enter a name.'],
    ['x'.repeat(61), 'Use at most 60 characters.'],
  ])('refuses %j', async (value, message) => {
    const { fixture, element } = await render(NameHost);
    const dialog = element.querySelector('dialog')!;
    typeName(dialog, value);
    await click(fixture, byLabel(dialog, 'Save'));
    await fixture.whenStable();
    expect(fixture.componentInstance.saved).toEqual([]);
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.querySelector('#name-dialog-error')?.textContent.trim()).toBe(message);
  });

  it('cancels without saving', async () => {
    const { fixture, element } = await render(NameHost);
    await click(fixture, byLabel(element, 'Cancel'));
    expect(fixture.componentInstance.saved).toEqual([]);
    expect(element.querySelector('dialog')).toBeNull();
  });
});

describe('SetlistSheet', () => {
  it('creates a first setlist when there is none', async () => {
    const { element } = await render(SetlistSheet);
    expect(library.setlists().map((list) => list.name)).toEqual(['Setlist 1']);
    expect(element.querySelector('section')?.getAttribute('aria-label')).toBe('Setlist 1');
  });

  it('lists pieces with a summary and loads one on tap', async () => {
    const { list } = concert();
    const { fixture, element } = await render(SetlistSheet);
    expect(queryAllText(element, 'li button.flex-1 span:first-child')).toEqual([
      'Piece 1',
      'Piece 2',
      'Piece 3',
    ]);
    expect(queryAllText(element, 'li button.flex-1 span:last-child')).toEqual([
      '60 BPM · 3/4 · ♩',
      '90 BPM · 3/4 · ♩',
      '120 BPM · 3/4 · ♩',
    ]);
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    await click(fixture, byLabel(element, /^Piece 2/));
    expect(metronome.bpm()).toBe(90);
    expect(library.activePiece()?.setlistId).toBe(list.id);
    expect(library.activePosition()?.index).toBe(1);
    expect(closed).toBe(true);
  });

  it('marks the loaded piece', async () => {
    const { list, pieces } = concert();
    library.setActivePiece({ setlistId: list.id, pieceId: pieces[2]!.id });
    const { element } = await render(SetlistSheet);
    expect(element.querySelector('.sr-only')?.textContent).toBe('Loaded');
  });

  it('saves the current metronome as a new, active piece', async () => {
    const { list } = concert();
    metronome.setBpm(77);
    const { fixture, element } = await render(SetlistSheet);
    await click(fixture, byLabel(element, 'Save current as piece'));
    const dialog = element.querySelector('app-name-dialog dialog') as HTMLElement;
    expect((dialog.querySelector('input') as HTMLInputElement).value).toBe('Piece 4');
    typeName(dialog, 'Encore');
    await click(fixture, byLabel(dialog, 'Save'));
    await fixture.whenStable();
    const saved = library.setlists()[0]!.pieces.at(-1)!;
    expect(saved).toEqual(expect.objectContaining({ name: 'Encore', bpm: 77 }));
    expect(library.activePiece()).toEqual({ setlistId: list.id, pieceId: saved.id });
  });

  it('creates and renames setlists', async () => {
    concert();
    const { fixture, element } = await render(SetlistSheet);
    await click(fixture, byLabel(element, 'New setlist'));
    let dialog = element.querySelector('app-name-dialog dialog') as HTMLElement;
    expect(dialog.querySelector('h2')?.textContent).toBe('New setlist');
    expect((dialog.querySelector('input') as HTMLInputElement).value).toBe('Setlist 2');
    await click(fixture, byLabel(dialog, 'Save'));
    await fixture.whenStable();
    expect(library.setlists().map((list) => list.name)).toEqual(['Concert', 'Setlist 2']);

    await click(fixture, byLabel(element, 'Edit'));
    await click(fixture, byLabel(element, 'Rename Concert'));
    dialog = element.querySelector('app-name-dialog dialog') as HTMLElement;
    expect(dialog.querySelector('h2')?.textContent).toBe('Rename setlist');
    typeName(dialog, 'Gala');
    await click(fixture, byLabel(dialog, 'Save'));
    await fixture.whenStable();
    expect(library.setlists()[0]!.name).toBe('Gala');
  });

  it('reorders, updates and deletes in edit mode only', async () => {
    const { pieces } = concert();
    const { fixture, element } = await render(SetlistSheet);
    expect(element.querySelector('[aria-label="Delete Piece 1"]')).toBeNull();
    const edit = byLabel(element, 'Edit');
    await click(fixture, edit);
    expect(edit.getAttribute('aria-pressed')).toBe('true');
    expect(edit.textContent.trim()).toBe('Finish');

    expect((byLabel(element, 'Move Piece 1 up') as HTMLButtonElement).disabled).toBe(true);
    expect((byLabel(element, 'Move Piece 3 down') as HTMLButtonElement).disabled).toBe(true);
    await click(fixture, byLabel(element, 'Move Piece 1 down'));
    expect(library.setlists()[0]!.pieces.map((piece) => piece.name)).toEqual([
      'Piece 2',
      'Piece 1',
      'Piece 3',
    ]);
    await click(fixture, byLabel(element, 'Move Piece 3 up'));
    expect(library.setlists()[0]!.pieces.map((piece) => piece.name)).toEqual([
      'Piece 2',
      'Piece 3',
      'Piece 1',
    ]);

    metronome.setBpm(200);
    await click(fixture, byLabel(element, 'Update Piece 1 with current settings'));
    expect(library.setlists()[0]!.pieces.find((piece) => piece.id === pieces[0]!.id)?.bpm).toBe(
      200,
    );

    await click(fixture, byLabel(element, /^Piece 2/));
    expect(metronome.bpm()).toBe(200);

    await click(fixture, byLabel(element, 'Delete Piece 2'));
    expect(library.setlists()[0]!.pieces.map((piece) => piece.name)).toEqual([
      'Piece 3',
      'Piece 1',
    ]);
    await click(fixture, byLabel(element, 'Delete Concert'));
    expect(library.setlists()).toEqual([]);

    await click(fixture, edit);
    expect(edit.textContent.trim()).toBe('Edit');
  });
});
