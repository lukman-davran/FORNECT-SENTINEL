import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { HubService } from '../../core/services/hub';
import { TranslatePipe } from '../../shared/pipes/translate';

interface SplashSettings {
  headline: string;
  message: string;
  brandName: string;
}

@Component({
  selector: 'app-pro-hospitality',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './pro-hospitality.html',
  styleUrl: './pro-hospitality.scss'
})
export class ProHospitality {
  private readonly authService = inject(AuthService);
  private readonly hubService = inject(HubService);

  autoProtectGuests = this.loadAutoProtect();

  splash: SplashSettings = this.loadSplash();

  saved = false;

  // POC: statistika bez identifikacije pojedinačnih gostiju.
  readonly guestsToday = 34;
  readonly guestsThisWeek = 218;
  readonly averageSessionMinutes = 42;

  get connectedGuests(): number {
    return this.hubService.hub().connectedUsers;
  }

  toggleAutoProtect(): void {
    this.autoProtectGuests = !this.autoProtectGuests;

    localStorage.setItem(
      this.key('auto-protect'),
      JSON.stringify(this.autoProtectGuests)
    );
  }

  saveSplash(): void {
    localStorage.setItem(
      this.key('splash'),
      JSON.stringify(this.splash)
    );

    this.saved = true;

    window.setTimeout(() => {
      this.saved = false;
    }, 2000);
  }

  private key(name: string): string {
    const accountId =
      this.authService.currentUser()?.accountId ??
      'anonymous';

    return `fornect-hospitality-${name}-${accountId}`;
  }

  private loadAutoProtect(): boolean {
    const saved = localStorage.getItem(
      this.key('auto-protect')
    );

    if (saved === null) {
      return true;
    }

    try {
      return JSON.parse(saved) === true;
    } catch {
      return true;
    }
  }

  private loadSplash(): SplashSettings {
    const saved = localStorage.getItem(
      this.key('splash')
    );

    if (saved) {
      try {
        const splash =
          JSON.parse(saved) as Partial<SplashSettings>;

        return {
          headline: splash.headline ?? 'Dobrodošli',
          message:
            splash.message ??
            'Vaša veza je zaštićena Fornect uređajem.',
          brandName: splash.brandName ?? 'Fornect'
        };
      } catch {
        // Ide na podrazumijevane vrijednosti.
      }
    }

    return {
      headline: 'Dobrodošli',
      message:
        'Vaša veza je zaštićena Fornect uređajem.',
      brandName: 'Fornect'
    };
  }
}
