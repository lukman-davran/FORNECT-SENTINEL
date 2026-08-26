import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  DeviceService,
  PairingState
} from '../../core/services/device';

@Component({
  selector: 'app-protection',
  imports: [RouterLink],
  templateUrl: './protection.html',
  styleUrl: './protection.scss'
})
export class Protection {
  private readonly route = inject(ActivatedRoute);
  private readonly deviceService = inject(DeviceService);

  deviceId = this.route.snapshot.paramMap.get('id') ?? 'amar-iphone';

  device =
    this.deviceService.getDevice(this.deviceId) ??
    this.deviceService.getDevice('amar-iphone')!;

  deviceName = this.device.name;

  pairingState: PairingState = this.device.pairingState;

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

  private updatePairingState(state: PairingState): void {
    this.pairingState = state;

    this.deviceService.updateDevice(
      this.deviceId,
      {
        pairingState: state,
        protectionLevel:
          state === 'paired'
            ? 'full'
            : 'standard'
      }
    );

    localStorage.setItem(
      `fornect-pairing-${this.deviceId}`,
      state
    );
  }
}
