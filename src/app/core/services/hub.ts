import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from './auth';

export type HubKind = 'home' | 'pro';
export type HubMode = 'home' | 'hospitality' | 'agency';
export type LoadPeriod = 'day' | 'week' | 'month';

export interface HubInfo {
  name: string;
  serialNumber: string;
  kind: HubKind;
  mode: HubMode;
  softwareVersion: string;
  online: boolean;
  capacity: number;
  connectedUsers: number;
}

export interface LoadPoint {
  label: string;
  value: number;
}

/**
 * Fornect uređaj (hub) na koji je nalog uparen.
 *
 * Specifikacija kaže da aplikacija pri prijavi čita tip
 * uređaja i softverski mod sa backend-a, pa na osnovu toga
 * renderuje Home ili Pro set ekrana. Dok backend ne postoji,
 * mod se drži account-scoped u localStorage-u i mijenja se
 * iz Postavki. Kada Fastify API bude spreman, mijenja se
 * samo `load()` — ostatak aplikacije ostaje isti.
 */
@Injectable({
  providedIn: 'root'
})
export class HubService {
  private readonly authService = inject(AuthService);

  readonly hub = signal<HubInfo>(this.load());

  readonly isPro = computed(
    () => this.hub().kind === 'pro'
  );

  readonly mode = computed(() => this.hub().mode);

  readonly capacityPercent = computed(() => {
    const hub = this.hub();

    if (hub.capacity <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (hub.connectedUsers / hub.capacity) * 100
      )
    );
  });

  readonly nearCapacity = computed(
    () => this.capacityPercent() >= 80
  );

  setMode(mode: HubMode): void {
    const kind: HubKind =
      mode === 'home' ? 'home' : 'pro';

    const hub: HubInfo = {
      ...this.hub(),
      kind,
      mode,
      name:
        kind === 'pro'
          ? 'Fornect Pro'
          : 'Fornect Home',
      capacity: kind === 'pro' ? 100 : 20,
      connectedUsers: kind === 'pro' ? 47 : 4
    };

    this.hub.set(hub);
    this.save(hub);
  }

  syncWithCurrentAccount(): void {
    this.hub.set(this.load());
  }

  getLoad(period: LoadPeriod): LoadPoint[] {
    switch (period) {
      case 'week':
        return [
          { label: 'Mon', value: 38 },
          { label: 'Tue', value: 44 },
          { label: 'Wed', value: 41 },
          { label: 'Thu', value: 52 },
          { label: 'Fri', value: 68 },
          { label: 'Sat', value: 74 },
          { label: 'Sun', value: 59 }
        ];

      case 'month':
        return [
          { label: 'W1', value: 42 },
          { label: 'W2', value: 51 },
          { label: 'W3', value: 63 },
          { label: 'W4', value: 71 }
        ];

      default:
        return [
          { label: '00', value: 12 },
          { label: '04', value: 8 },
          { label: '08', value: 26 },
          { label: '12', value: 44 },
          { label: '16', value: 51 },
          { label: '20', value: 63 },
          { label: '24', value: 47 }
        ];
    }
  }

  private storageKey(accountId: string): string {
    return `fornect-hub-${accountId}`;
  }

  private save(hub: HubInfo): void {
    const accountId =
      this.authService.currentUser()?.accountId ??
      'anonymous';

    localStorage.setItem(
      this.storageKey(accountId),
      JSON.stringify(hub)
    );
  }

  private load(): HubInfo {
    const accountId =
      this.authService.currentUser()?.accountId ??
      'anonymous';

    const saved = localStorage.getItem(
      this.storageKey(accountId)
    );

    if (saved) {
      try {
        const hub = JSON.parse(saved) as HubInfo;

        if (hub.mode) {
          return hub;
        }
      } catch {
        localStorage.removeItem(
          this.storageKey(accountId)
        );
      }
    }

    const fallback: HubInfo = {
      name: 'Fornect Home',
      serialNumber: 'FH-POC-001',
      kind: 'home',
      mode: 'home',
      softwareVersion: '0.1.0',
      online: true,
      capacity: 20,
      connectedUsers: 4
    };

    // Podrazumijevano stanje se odmah snima da bi uređaj
    // imao zapis i prije prve promjene moda.
    this.save(fallback);

    return fallback;
  }
}
