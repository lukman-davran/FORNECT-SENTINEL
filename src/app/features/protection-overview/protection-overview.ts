import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DeviceService,
  FornectNetworkDevice
} from '../../core/services/device';

@Component({
  selector: 'app-protection-overview',
  imports: [RouterLink],
  templateUrl: './protection-overview.html',
  styleUrl: './protection-overview.scss'
})
export class ProtectionOverview {
  private readonly deviceService = inject(DeviceService);

  get devices(): FornectNetworkDevice[] {
    return this.deviceService.devices();
  }

  get fullProtectionCount(): number {
    return this.devices.filter(
      device => device.protectionLevel === 'full'
    ).length;
  }

  get standardProtectionCount(): number {
    return this.devices.filter(
      device => device.protectionLevel === 'standard'
    ).length;
  }

  get needsSetupCount(): number {
    return this.devices.filter(
      device => device.protectionLevel === 'needs-setup'
    ).length;
  }

  getProtectionLabel(device: FornectNetworkDevice): string {
    switch (device.protectionLevel) {
      case 'full':
        return 'Full Protection';

      case 'standard':
        return 'Standard Protection';

      case 'needs-setup':
        return 'Needs setup';
    }
  }

  getPairingLabel(device: FornectNetworkDevice): string {
    switch (device.pairingState) {
      case 'paired':
        return 'Paired';

      case 'pairing':
        return 'Pairing';

      case 'failed':
        return 'Pairing failed';

      default:
        return 'Not paired';
    }
  }
}
