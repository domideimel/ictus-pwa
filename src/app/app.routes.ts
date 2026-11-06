import type { Routes } from '@angular/router';

/** Phone tabs. On tablets and desktops the shell shows both on one screen instead. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'metronome' },
  {
    path: 'metronome',
    title: 'Metronome · Ictus',
    loadComponent: () => import('./pages/metronome-page'),
  },
  { path: 'tuner', title: 'Tuner · Ictus', loadComponent: () => import('./pages/tuner-page') },
  { path: '**', redirectTo: 'metronome' },
];
