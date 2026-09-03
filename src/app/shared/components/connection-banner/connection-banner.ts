import { Component, inject } from '@angular/core';

import {
  ConnectionService
} from '../../../core/services/connection';

import {
  LanguageService
} from '../../../core/services/language';

import { TranslatePipe } from '../../pipes/translate';

/**
 * Traka koja objašnjava da uređaj nije dostupan i da je
 * prikazano posljednje poznato stanje. Stoji na ekranima
 * koji prikazuju podatke sa uređaja.
 */
@Component({
  selector: 'app-connection-banner',
  imports: [TranslatePipe],
  templateUrl: './connection-banner.html',
  styleUrl: './connection-banner.scss'
})
export class ConnectionBanner {
  private readonly connectionService =
    inject(ConnectionService);

  private readonly languageService =
    inject(LanguageService);

  get visible(): boolean {
    return this.connectionService.isStale();
  }

  get isError(): boolean {
    return this.connectionService.status() === 'error';
  }

  get titleKey(): string {
    return this.isError
      ? 'connection.errorTitle'
      : 'connection.offlineTitle';
  }

  get descriptionKey(): string {
    return this.isError
      ? 'connection.errorDescription'
      : 'connection.offlineDescription';
  }

  get lastSyncedLabel(): string {
    const lastSyncedAt =
      this.connectionService.lastSyncedAt();

    if (!lastSyncedAt) {
      return this.languageService.t(
        'connection.neverSynced'
      );
    }

    const minutes = Math.floor(
      (Date.now() - lastSyncedAt) / 60000
    );

    if (minutes < 1) {
      return this.languageService.t(
        'connection.justNow'
      );
    }

    if (minutes < 60) {
      return this.languageService.t(
        'connection.minutesAgo',
        { minutes }
      );
    }

    return this.languageService.t(
      'connection.hoursAgo',
      { hours: Math.floor(minutes / 60) }
    );
  }

  retry(): void {
    this.connectionService.retry();
  }
}
