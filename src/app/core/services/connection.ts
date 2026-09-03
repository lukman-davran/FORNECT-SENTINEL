import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from './auth';

export type ConnectionStatus = 'online' | 'offline' | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  lastSyncedAt: number | null;
}

/**
 * Stanje veze sa Fornect uređajem.
 *
 * Specifikacija traži da aplikacija ne bude prazna pri
 * kratkotrajnom gubitku konekcije: posljednje poznato stanje
 * ostaje vidljivo, uz jasnu poruku da podaci nisu svježi.
 *
 * Podaci se ionako drže u localStorage-u, pa je keš već tu.
 * Ovaj servis dodaje ono što je nedostajalo: oznaku koliko
 * su podaci stari i da li se uređaju uopšte može pristupiti.
 *
 * U POC-u se stanje mijenja ručno iz Postavki. Kada backend
 * bude spreman, `setStatus` poziva HTTP sloj na osnovu
 * stvarnog odgovora API-ja.
 */
@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private readonly authService = inject(AuthService);

  private readonly state = signal<ConnectionState>(
    this.load()
  );

  readonly status = computed(() => this.state().status);

  readonly isOnline = computed(
    () => this.state().status === 'online'
  );

  /** Podaci na ekranu su posljednji poznati, ne svježi. */
  readonly isStale = computed(
    () => this.state().status !== 'online'
  );

  readonly lastSyncedAt = computed(
    () => this.state().lastSyncedAt
  );

  constructor() {
    if (this.state().status === 'online') {
      this.markSynced();
    }
  }

  setStatus(status: ConnectionStatus): void {
    const state: ConnectionState = {
      status,
      lastSyncedAt:
        status === 'online'
          ? Date.now()
          : this.state().lastSyncedAt
    };

    this.state.set(state);
    this.save(state);
  }

  /** Ponovni pokušaj povezivanja. */
  retry(): void {
    this.setStatus('online');
  }

  markSynced(): void {
    const state: ConnectionState = {
      status: this.state().status,
      lastSyncedAt: Date.now()
    };

    this.state.set(state);
    this.save(state);
  }

  syncWithCurrentAccount(): void {
    this.state.set(this.load());
  }

  private storageKey(): string {
    const accountId =
      this.authService.currentUser()?.accountId ??
      'anonymous';

    return `fornect-connection-${accountId}`;
  }

  private save(state: ConnectionState): void {
    localStorage.setItem(
      this.storageKey(),
      JSON.stringify(state)
    );
  }

  private load(): ConnectionState {
    const saved = localStorage.getItem(
      this.storageKey()
    );

    if (saved) {
      try {
        const state =
          JSON.parse(saved) as Partial<ConnectionState>;

        return {
          status:
            state.status === 'offline' ||
            state.status === 'error'
              ? state.status
              : 'online',
          lastSyncedAt: state.lastSyncedAt ?? null
        };
      } catch {
        localStorage.removeItem(this.storageKey());
      }
    }

    return {
      status: 'online',
      lastSyncedAt: null
    };
  }
}
