import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Anmelden – Weinkeller',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'settings',
    title: 'Einstellungen – Weinkeller',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Übersicht – Weinkeller',
        loadComponent: () => import('./pages/overview/overview').then((m) => m.Overview),
      },
      {
        path: 'cellar',
        title: 'Keller – Weinkeller',
        loadComponent: () => import('./pages/cellar/cellar').then((m) => m.Cellar),
      },
      {
        path: 'grapes',
        title: 'Rebsorten – Weinkeller',
        loadComponent: () => import('./pages/grapes/grapes').then((m) => m.Grapes),
      },
      {
        path: 'origins',
        title: 'Länder & Regionen – Weinkeller',
        loadComponent: () => import('./pages/origins/origins').then((m) => m.Origins),
      },
      {
        path: 'wines/new',
        title: 'Wein hinzufügen – Weinkeller',
        loadComponent: () => import('./pages/wine-new/wine-new').then((m) => m.WineNew),
      },
      {
        path: 'wines/:id/edit',
        title: 'Wein bearbeiten – Weinkeller',
        loadComponent: () => import('./pages/wine-edit/wine-edit').then((m) => m.WineEdit),
      },
      {
        path: 'wines/:id',
        title: 'Wein – Weinkeller',
        loadComponent: () => import('./pages/wine-detail/wine-detail').then((m) => m.WineDetail),
      },
      {
        path: 'drafts',
        title: 'Entwürfe – Weinkeller',
        loadComponent: () => import('./pages/drafts/drafts').then((m) => m.Drafts),
      },
      {
        path: 'drafts/:id',
        title: 'Entwurf prüfen – Weinkeller',
        loadComponent: () => import('./pages/draft-review/draft-review').then((m) => m.DraftReview),
      },
      {
        path: 'racks',
        title: 'Regale – Weinkeller',
        loadComponent: () => import('./pages/racks/racks').then((m) => m.Racks),
      },
      {
        path: 'racks/:id',
        title: 'Regal – Weinkeller',
        loadComponent: () => import('./pages/rack-detail/rack-detail').then((m) => m.RackDetail),
      },
      {
        path: 'archive',
        title: 'Archiv – Weinkeller',
        loadComponent: () => import('./pages/archive/archive').then((m) => m.Archive),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
