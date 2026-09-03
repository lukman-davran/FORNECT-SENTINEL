import { Component, inject } from '@angular/core';
import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  DeviceService,
  PairingState
} from '../../core/services/device';

export type CertificatePlatform =
  | 'android'
  | 'ios'
  | 'desktop';

/**
 * Jedna kontrola sa tri jacine umjesto prekidaca i odvojenog
 * izbora nivoa. Certifikat nije nivo zastite nego preduslov za
 * najvisi - zato je izdvojen u vlastitu sekciju.
 */
export type ProtectionChoice = 'off' | 'standard' | 'full';

import {
  LanguageService
} from '../../core/services/language';

import {
  TranslatePipe
} from '../../shared/pipes/translate';

@Component({
  selector: 'app-protection',
  imports: [
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './protection.html',
  styleUrl: './protection.scss'
})
export class Protection {
  private readonly route = inject(ActivatedRoute);
  private readonly deviceService = inject(DeviceService);
  private readonly languageService = inject(LanguageService);

  deviceId =
    this.route.snapshot.paramMap.get('id') ??
    'amar-iphone';

  device =
    this.deviceService.getDevice(this.deviceId) ??
    this.deviceService.getDevice('amar-iphone')!;

  deviceName = this.device.name;

  pairingState: PairingState =
    this.device.pairingState;

  get protectionEnabled(): boolean {
    return this.device.protectionEnabled !== false;
  }

  /**
   * Certifikat instaliran na uredjaju. Odvojeno od toga da li
   * se puna zastita trenutno koristi - profil moze ostati
   * instaliran dok je zastita spustena na standardnu.
   */
  get certificateInstalled(): boolean {
    return this.pairingState === 'paired';
  }

  /** Izbor roditelja. Nakon uparivanja podrazumijevano puna. */
  get useFullProtection(): boolean {
    return this.device.useFullProtection !== false;
  }

  /**
   * Stvarni nivo zastite: puna samo ako je certifikat
   * instaliran I ako je roditelj nije spustio na standardnu.
   */
  get effectiveLevel(): 'standard' | 'full' {
    return this.certificateInstalled &&
      this.useFullProtection
      ? 'full'
      : 'standard';
  }

  get protectionStatusLabel(): string {
    if (!this.protectionEnabled) {
      return this.languageService.t(
        'protection.off'
      );
    }

    return this.effectiveLevel === 'full'
      ? this.languageService.t('protection.full')
      : this.languageService.t('protection.standard');
  }

  get blockedAdsToday(): number {
    return this.device.blockedAdsToday ?? 128;
  }

  get awayFromHomeEnabled(): boolean {
    return this.device.protectAwayFromHome === true;
  }

  toggleAwayFromHome(): void {
    if (!this.protectionEnabled) {
      return;
    }

    this.deviceService.updateDevice(
      this.deviceId,
      {
        protectAwayFromHome:
          !this.awayFromHomeEnabled
      }
    );

    this.refreshDevice();
  }

  readonly levels: ProtectionChoice[] = [
    'off',
    'standard',
    'full'
  ];

  /** Trenutno stanje kao jedna od tri jacine. */
  get level(): ProtectionChoice {
    if (!this.protectionEnabled) {
      return 'off';
    }

    return this.effectiveLevel;
  }

  levelTitleKey(level: ProtectionChoice): string {
    switch (level) {
      case 'off':
        return 'protection.levelOff';
      case 'standard':
        return 'protection.standard';
      default:
        return 'protection.full';
    }
  }

  levelDescriptionKey(level: ProtectionChoice): string {
    switch (level) {
      case 'off':
        return 'protection.levelOffDescription';
      case 'standard':
        return 'protection.standardDescription';
      default:
        return 'protection.fullDescription';
    }
  }

  levelIcon(level: ProtectionChoice): string {
    switch (level) {
      case 'off':
        return 'OFF';
      case 'standard':
        return 'DNS';
      default:
        return 'FULL';
    }
  }

  /** Puna jacina je zakljucana dok profil nije instaliran. */
  isLevelLocked(level: ProtectionChoice): boolean {
    return (
      level === 'full' && !this.certificateInstalled
    );
  }

  /**
   * Izbor jacine. Puna trazi instaliran profil, pa klik na nju
   * bez profila vodi u instalaciju umjesto da ne uradi nista.
   * Spustanje na standardnu ne dira certifikat - povratak na
   * punu kasnije ne trazi ponovnu instalaciju.
   */
  setLevel(level: ProtectionChoice): void {
    if (level === 'off') {
      this.deviceService.updateDevice(this.deviceId, {
        protectionEnabled: false
      });

      this.refreshDevice();

      return;
    }

    if (level === 'full' && !this.certificateInstalled) {
      this.deviceService.updateDevice(this.deviceId, {
        protectionEnabled: true,
        useFullProtection: true
      });

      this.refreshDevice();
      this.startPairing();

      return;
    }

    this.deviceService.updateDevice(this.deviceId, {
      protectionEnabled: true,
      useFullProtection: level === 'full',
      protectionLevel:
        level === 'full' && this.certificateInstalled
          ? 'full'
          : 'standard'
    });

    this.refreshDevice();
  }

  /** Skidanje profila sa uredjaja je svjesna, zasebna radnja. */
  removeCertificate(): void {
    this.updatePairingState('unpaired');
  }

  readonly certPlatforms: CertificatePlatform[] = [
    'android',
    'ios',
    'desktop'
  ];

  certPlatform: CertificatePlatform = 'android';

  setCertPlatform(platform: CertificatePlatform): void {
    this.certPlatform = platform;
  }

  platformLabelKey(platform: CertificatePlatform): string {
    return `protection.platform${
      platform.charAt(0).toUpperCase() + platform.slice(1)
    }`;
  }

  /** Koraci instalacije za izabranu platformu. */
  get certificateSteps(): string[] {
    const prefix = `protection.${this.certPlatform}Step`;

    return [1, 2, 3, 4, 5].map(
      step => `${prefix}${step}`
    );
  }

  get platformNoteKey(): string {
    return `protection.${this.certPlatform}Note`;
  }

  startPairing(): void {
    this.updatePairingState('pairing');
  }

  completePairing(): void {
    this.updatePairingState('paired');
  }

  failPairing(): void {
    this.updatePairingState('failed');
  }

  resetPairing(): void {
    this.updatePairingState('unpaired');
  }

  private updatePairingState(
    state: PairingState
  ): void {
    this.pairingState = state;

    // Tek instaliran profil znaci da roditelj hoce punu
    // zastitu - zato se izbor tada resetuje na punu.
    const useFull =
      state === 'paired'
        ? true
        : this.useFullProtection;

    this.deviceService.updateDevice(
      this.deviceId,
      {
        pairingState: state,
        useFullProtection: useFull,
        protectionLevel:
          state === 'paired' && useFull
            ? 'full'
            : 'standard'
      }
    );

    localStorage.setItem(
      `fornect-pairing-${this.deviceId}`,
      state
    );

    this.refreshDevice();
  }

  private refreshDevice(): void {
    const updated =
      this.deviceService.getDevice(this.deviceId);

    if (updated) {
      this.device = updated;
      this.deviceName = updated.name;
      this.pairingState = updated.pairingState;
    }
  }
}
