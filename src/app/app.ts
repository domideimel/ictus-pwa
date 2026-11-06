import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { RestCounter } from './metronome/rest-counter';
import { CombinedView } from './pages/combined-view';
import { SettingsSheet } from './settings/settings-sheet';
import { LibraryStore } from './state/library.store';
import { MetronomeStore } from './state/metronome.store';
import { SettingsStore } from './state/settings.store';
import { TunerStore } from './state/tuner.store';
import { UiStore } from './state/ui.store';
import { WakeLock } from './state/wake-lock';
import { Icon } from './ui/icon';
import { UpdatePrompt } from './ui/update-prompt';
import { Viewport } from './ui/viewport';

/**
 * Two tabs on phones, one combined screen on tablets and desktops, plus everything that spans both:
 * settings, the rest counter and hardware keys (Space, T, page-turner pedals).
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CombinedView,
    SettingsSheet,
    RestCounter,
    Icon,
    UpdatePrompt,
  ],
  host: {
    class: 'flex h-dvh flex-col overflow-hidden safe-top',
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    @if (viewport.isWide()) {
      <app-combined-view />
    } @else {
      <main class="flex min-h-0 flex-1 flex-col">
        <router-outlet />
      </main>
      <nav
        class="grid shrink-0 grid-cols-2 border-t border-stroke bg-panel pt-1.5 safe-bottom"
        aria-label="Screens"
      >
        @for (tab of tabs; track tab.path) {
          <a
            [routerLink]="tab.path"
            routerLinkActive="text-accent-text font-semibold"
            ariaCurrentWhenActive="page"
            class="flex flex-col items-center gap-1 py-1 text-[11.5px] font-medium text-muted"
          >
            <app-icon [name]="tab.icon" [size]="24" />
            {{ tab.label }}
          </a>
        }
      </nav>
    }

    @if (ui.showSettings()) {
      <app-settings-sheet (closed)="ui.closeSettings()" />
    }
    @if (metronome.rest()) {
      <app-rest-counter />
    }
    <app-update-prompt />
  `,
})
export class App {
  protected readonly viewport = inject(Viewport);
  protected readonly ui = inject(UiStore);
  protected readonly metronome = inject(MetronomeStore);
  private readonly tuner = inject(TunerStore);
  private readonly library = inject(LibraryStore);
  private readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);

  protected readonly tabs = [
    { path: '/metronome', label: 'Metronome', icon: 'metronome' },
    { path: '/tuner', label: 'Tuner', icon: 'tuner' },
  ] as const;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly tunerOnScreen = computed(
    () => this.viewport.isWide() || this.url().startsWith('/tuner'),
  );

  constructor() {
    inject(WakeLock);
    effect(() => this.tuner.setOnScreen(this.tunerOnScreen()));
  }

  /** Space starts/stops, T taps; arrow and page keys are what Bluetooth page-turner pedals send. */
  protected onKeydown(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isTyping(event.target)
    )
      return;
    const left = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key);
    const right = ['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key);
    if (event.key === ' ') {
      // A focused button would also be clicked by Space; the shortcut wins outside dialogs.
      if (isInsideDialog(event.target)) return;
      event.preventDefault();
      this.metronome.toggle();
    } else if (event.key === 't' || event.key === 'T') {
      this.metronome.tap();
    } else if (left || right) {
      if (isInsideDialog(event.target) || isRadio(event.target)) return;
      event.preventDefault();
      this.pedal(left ? -1 : 1);
    }
  }

  /** Left pedal: tap tempo or previous piece. Right pedal: start/stop or next piece. */
  private pedal(side: -1 | 1): void {
    if (this.settings.pedalMode() === 'previousAndNext') {
      const piece = this.library.step(side);
      if (piece) this.metronome.apply(piece);
    } else if (side === -1) {
      this.metronome.tap();
    } else {
      this.metronome.toggle();
    }
  }
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('dialog[open]') !== null;
}

/** Radio groups (segmented pills, subdivisions) use the arrow keys themselves. */
function isRadio(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('[role="radiogroup"]') !== null;
}
