import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  LucideSmartphone,
  LucideTv,
  LucideGamepad2,
  LucideCircleQuestionMark
} from '@lucide/angular';

import {
  DeviceService,
  FornectNetworkDevice
} from '../../core/services/device';

import { HubService } from '../../core/services/hub';

import {
  TranslatePipe
} from '../../shared/pipes/translate';

import { ConnectionBanner } from '../../shared/components/connection-banner/connection-banner';

@Component({
  selector: 'app-devices',
  imports: [
    RouterLink,
    TranslatePipe,
    LucideSmartphone,
    LucideTv,
    LucideGamepad2,
    LucideCircleQuestionMark,
    ConnectionBanner
  ],
  templateUrl: './devices.html',
  styleUrl: './devices.scss'
})
export class Devices {
  private readonly deviceService =
    inject(DeviceService);

  private readonly hubService =
    inject(HubService);

  // Kapacitet je svojstvo Fornect uređaja, ne ekrana.
  // Home podržava do 20 uređaja, kako specifikacija kaže.
  get deviceLimit(): number {
    return this.hubService.hub().capacity;
  }

  get devices(): FornectNetworkDevice[] {
    return this.deviceService.devices();
  }

  get deviceLimitReached(): boolean {
    return this.devices.length >= this.deviceLimit;
  }

  get onlineCount(): number {
    return this.devices
      .filter(device => device.online)
      .length;
  }

  get protectedCount(): number {
    return this.devices
      .filter(device =>
        device.profile !== null &&
        device.protectionLevel !== 'needs-setup' &&
        device.protectionEnabled !== false
      )
      .length;
  }

  get unassignedCount(): number {
    return this.devices
      .filter(device => device.profile === null)
      .length;
  }

  getProtectionKey(
    device: FornectNetworkDevice
  ): string {
    if (device.protectionEnabled === false) {
      return 'devices.protectionOff';
    }

    switch (device.protectionLevel) {
      case 'full':
        return 'devices.fullProtection';

      case 'standard':
        return 'devices.standardProtection';

      default:
        return 'devices.needsSetup';
    }
  }

  getProfileKey(
    device: FornectNetworkDevice
  ): string {
    switch (device.profile) {
      case 'Child':
        return 'devices.childProfile';

      case 'Teen':
        return 'devices.teenProfile';

      case 'Adult':
        return 'devices.adultProfile';

      case 'Admin':
        return 'devices.adminProfile';

      default:
        return 'devices.noProfile';
    }
  }
}


