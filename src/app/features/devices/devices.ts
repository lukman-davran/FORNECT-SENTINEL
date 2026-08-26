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

@Component({
  selector: 'app-devices',
  imports: [
    RouterLink,
    LucideSmartphone,
    LucideTv,
    LucideGamepad2,
    LucideCircleQuestionMark
  ],
  templateUrl: './devices.html',
  styleUrl: './devices.scss'
})
export class Devices {
  private readonly deviceService = inject(DeviceService);

  get devices() {
    return this.deviceService.devices().map(device => ({
      ...device,
      protection: this.getProtectionLabel(device)
    }));
  }

  get onlineCount(): number {
    return this.deviceService.devices()
      .filter(device => device.online)
      .length;
  }

  get protectedCount(): number {
    return this.deviceService.devices()
      .filter(device => device.profile !== null)
      .length;
  }

  get unassignedCount(): number {
    return this.deviceService.devices()
      .filter(device => device.profile === null)
      .length;
  }

  private getProtectionLabel(
    device: FornectNetworkDevice
  ): 'Full protection' | 'Standard' | 'Needs setup' {
    switch (device.protectionLevel) {
      case 'full':
        return 'Full protection';

      case 'standard':
        return 'Standard';

      default:
        return 'Needs setup';
    }
  }
}
