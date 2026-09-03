import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { HubService } from '../services/hub';

/**
 * Uređaj i softverski mod određuju koji set ekrana korisnik
 * uopšte može otvoriti. Guardovi drže to na jednom mjestu,
 * umjesto da svaki ekran sam provjerava mod.
 */
export const homeModeGuard: CanActivateFn = () => {
  const hubService = inject(HubService);
  const router = inject(Router);

  return hubService.isPro()
    ? router.createUrlTree(['/pro'])
    : true;
};

export const proModeGuard: CanActivateFn = () => {
  const hubService = inject(HubService);
  const router = inject(Router);

  return hubService.isPro()
    ? true
    : router.createUrlTree(['/dashboard']);
};

export const hospitalityGuard: CanActivateFn = () => {
  const hubService = inject(HubService);
  const router = inject(Router);

  return hubService.mode() === 'hospitality'
    ? true
    : router.createUrlTree(['/pro']);
};

export const agencyGuard: CanActivateFn = () => {
  const hubService = inject(HubService);
  const router = inject(Router);

  return hubService.mode() === 'agency'
    ? true
    : router.createUrlTree(['/pro']);
};
