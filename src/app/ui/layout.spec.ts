import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { byLabel, click } from '../../testing/dom';
import { HeaderIconButton } from './header-icon-button';
import { Icon, IconName } from './icon';
import { SectionLabel } from './section-label';
import { SettingsGroup, SettingsRow } from './settings-group';
import { Sheet } from './sheet';
import { Surface } from './surface';
import { Viewport } from './viewport';

@Component({
  imports: [Sheet],
  template: `
    @if (open()) {
      <app-sheet
        title="Practice"
        [closeLabel]="closeLabel()"
        (closed)="closedCount = closedCount + 1; open.set(false)"
      >
        <button sheetAccessory type="button">Edit</button>
        <p>Content</p>
      </app-sheet>
    }
  `,
})
class SheetHost {
  readonly open = signal(true);
  readonly closeLabel = signal('Close');
  closedCount = 0;
}

describe('Sheet', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(SheetHost);
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    return { fixture, dialog };
  };

  it('opens itself as a modal labelled by its title', async () => {
    const { dialog } = await setup();
    expect(dialog.open).toBe(true);
    const title = dialog.querySelector('h2')!;
    expect(title.textContent?.trim()).toBe('Practice');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.textContent).toContain('Content');
  });

  it('puts the accessory beside the round close button', async () => {
    const { dialog } = await setup();
    const header = [...dialog.querySelectorAll('header button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent?.trim(),
    );
    expect(header).toEqual(['Edit', 'Close']);
  });

  it('closes from the close button', async () => {
    const { fixture, dialog } = await setup();
    await click(fixture, byLabel(dialog, 'Close'));
    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
  });

  it('names the close button as asked', async () => {
    const fixture = TestBed.createComponent(SheetHost);
    fixture.componentInstance.closeLabel.set('Cancel');
    await fixture.whenStable();
    expect(byLabel(fixture.nativeElement, 'Cancel')).toBeTruthy();
  });

  it('closes on a backdrop click but not on a click inside', async () => {
    const { fixture, dialog } = await setup();
    await click(fixture, dialog.querySelector('p')!);
    expect(fixture.componentInstance.closedCount).toBe(0);
    await click(fixture, dialog);
    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('gives each sheet its own title id', async () => {
    const one = await setup();
    const two = await setup();
    expect(one.dialog.querySelector('h2')!.id).not.toBe(two.dialog.querySelector('h2')!.id);
  });
});

@Component({
  imports: [Surface],
  template: `
    <button type="button" appSurface>Plain</button>
    <button type="button" appSurface pressed [selected]="selected()">Chip</button>
  `,
})
class SurfaceHost {
  readonly selected = signal(false);
}

describe('Surface', () => {
  it('styles buttons and exposes aria-pressed only for toggle chips', async () => {
    const fixture = TestBed.createComponent(SurfaceHost);
    await fixture.whenStable();
    const [plain, chip] = [
      ...fixture.nativeElement.querySelectorAll('button'),
    ] as HTMLButtonElement[];
    expect(plain.hasAttribute('aria-pressed')).toBe(false);
    expect(plain.className).toContain('bg-surface');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    fixture.componentInstance.selected.set(true);
    await fixture.whenStable();
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(chip.className).toContain('bg-fg');
  });
});

const ICON_NAMES: readonly IconName[] = [
  'settings',
  'setlist',
  'practice',
  'chevron-left',
  'chevron-right',
  'chevron-down',
  'play',
  'stop',
  'mic',
  'close',
  'plus',
  'more',
  'check',
  'arrow-up',
  'arrow-down',
  'trash',
  'pencil',
  'refresh',
  'metronome',
  'tuner',
];

@Component({
  imports: [HeaderIconButton, SettingsGroup, SettingsRow, SectionLabel, Icon],
  template: `
    <app-header-icon-button icon="settings" label="Settings" (pressed)="presses = presses + 1" />
    <app-settings-group title="Tuner" [footnote]="footnote()">
      <app-settings-row label="Clef" labelId="clef-label"><span>Bass</span></app-settings-row>
    </app-settings-group>
    <app-section-label>Tempo</app-section-label>
    @for (name of icons; track name) {
      <app-icon [name]="name" [size]="20" />
    }
  `,
})
class LayoutHost {
  presses = 0;
  readonly footnote = signal<string | undefined>('Applies at once.');
  readonly icons = ICON_NAMES;
}

describe('layout pieces', () => {
  it('emits from a labelled header icon button', async () => {
    const fixture = TestBed.createComponent(LayoutHost);
    await fixture.whenStable();
    await click(fixture, byLabel(fixture.nativeElement, 'Settings'));
    expect(fixture.componentInstance.presses).toBe(1);
  });

  it('renders a settings group with title, rows and an optional footnote', async () => {
    const fixture = TestBed.createComponent(LayoutHost);
    await fixture.whenStable();
    const group = fixture.nativeElement.querySelector('app-settings-group') as HTMLElement;
    expect(group.querySelector('h3')?.textContent).toBe('Tuner');
    expect(group.querySelector('#clef-label')?.textContent).toBe('Clef');
    expect(group.querySelector('p')?.textContent).toBe('Applies at once.');
    fixture.componentInstance.footnote.set(undefined);
    await fixture.whenStable();
    expect(group.querySelector('p')).toBeNull();
  });

  it('draws every icon as a decorative SVG', async () => {
    const fixture = TestBed.createComponent(LayoutHost);
    await fixture.whenStable();
    const icons = [...fixture.nativeElement.querySelectorAll(':scope > app-icon')] as HTMLElement[];
    expect(icons).toHaveLength(ICON_NAMES.length);
    for (const icon of icons) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelector('svg')?.getAttribute('width')).toBe('20');
      expect(icon.querySelector('svg')!.children.length).toBeGreaterThan(0);
    }
  });

  it('shows the section label text', async () => {
    const fixture = TestBed.createComponent(LayoutHost);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-section-label')?.textContent?.trim()).toBe(
      'Tempo',
    );
  });
});

describe('Viewport', () => {
  const resize = (width: number, height: number): void => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
  };

  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('uses the window size and treats 768 px and up as wide', () => {
    resize(390, 844);
    TestBed.resetTestingModule();
    const viewport = TestBed.inject(Viewport);
    expect(viewport.width()).toBe(390);
    expect(viewport.height()).toBe(844);
    expect(viewport.isWide()).toBe(false);
    expect(viewport.finePointer()).toBe(false);
  });

  it('follows resizes and pointer changes where matchMedia exists', () => {
    const listeners: (() => void)[] = [];
    const query = {
      matches: false,
      addEventListener: (_: string, l: () => void) => listeners.push(l),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => query });
    resize(390, 844);
    TestBed.resetTestingModule();
    const viewport = TestBed.inject(Viewport);
    resize(1024, 768);
    expect(viewport.isWide()).toBe(true);
    query.matches = true;
    listeners.forEach((listener) => listener());
    expect(viewport.finePointer()).toBe(true);

    TestBed.resetTestingModule();
    expect(query.removeEventListener).toHaveBeenCalled();
    resize(390, 844);
    expect(viewport.width()).toBe(1024);
  });
});
