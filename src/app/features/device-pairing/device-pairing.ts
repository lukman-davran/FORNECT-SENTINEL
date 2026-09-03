import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../core/services/auth';
import { DeviceService } from '../../core/services/device';

import {
  AppLanguage,
  LanguageService
} from '../../core/services/language';

import {
  TranslatePipe
} from '../../shared/pipes/translate';
import { LanguageSwitch } from '../../shared/components/language-switch/language-switch';

type PairingMethod = 'qr' | 'serial';

@Component({
  selector: 'app-device-pairing',
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    LanguageSwitch
  ],
  templateUrl: './device-pairing.html',
  styleUrl: './device-pairing.scss'
})
export class DevicePairing {
  private readonly authService =
    inject(AuthService);

  private readonly deviceService =
    inject(DeviceService);

  private readonly languageService =
    inject(LanguageService);

  private readonly router =
    inject(Router);

  method: PairingMethod = 'qr';

  serialNumber = '';
  errorMessageKey = '';
  paired = false;

  pairedDevice = {
    name: 'Fornect Home',
    serialNumber: '',
    softwareMode: 'Home'
  };

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage();
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

  selectMethod(method: PairingMethod): void {
    this.method = method;
    this.errorMessageKey = '';
  }

  simulateQrScan(): void {
    this.pairedDevice = {
      name: 'Fornect Home',
      serialNumber: 'FH-POC-001',
      softwareMode: 'Home'
    };

    this.savePairing();
  }

  pairBySerial(): void {
    this.errorMessageKey = '';

    const serial =
      this.serialNumber.trim();

    if (serial.length < 6) {
      this.errorMessageKey =
        'pair.invalidSerial';
      return;
    }

    this.pairedDevice = {
      name: 'Fornect Home',
      serialNumber: serial,
      softwareMode: 'Home'
    };

    this.savePairing();
  }

  continueToDashboard(): void {
    const selectedLanguage =
      this.currentLanguage;

    const registrationCompleted =
      this.authService.completeRegistration();

    if (!registrationCompleted) {
      this.router.navigate(['/login']);
      return;
    }

    // Nakon registracije current account sada postoji,
    // pa se odabrani jezik sprema baš za taj account.
    this.languageService.setLanguage(
      selectedLanguage
    );

    // POC: simulira automatsko otkrivanje uređaja
    // na mreži nakon pairinga Fornect uređaja.
    this.deviceService
      .discoverDemoDevicesForCurrentAccount();

    sessionStorage.removeItem(
      'fornect-pending-registration'
    );

    sessionStorage.removeItem(
      'fornect-email-verified'
    );

    this.router.navigate(['/dashboard']);
  }

  private savePairing(): void {
    localStorage.setItem(
      'fornect-paired-device',
      JSON.stringify(this.pairedDevice)
    );

    this.paired = true;
  }
}
