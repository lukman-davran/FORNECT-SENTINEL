import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.Login)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard)
  },
  {
    path: 'devices',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/devices/devices').then((m) => m.Devices)
  },
  {
    path: 'devices/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/device-details/device-details').then((m) => m.DeviceDetails)
  },
  {
    path: 'devices/:id/schedule',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/schedule/schedule').then((m) => m.Schedule)
  },
  {
    path: 'devices/:id/protection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/protection/protection').then((m) => m.Protection)
  },
  {
    path: 'devices/:id/setup',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/device-setup/device-setup').then((m) => m.DeviceSetup)
  },
  {
    path: 'schedules',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/schedules/schedules').then((m) => m.Schedules)
  },
  {
    path: 'protection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/protection-overview/protection-overview')
        .then((m) => m.ProtectionOverview)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];


