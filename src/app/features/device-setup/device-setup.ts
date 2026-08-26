import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DeviceService } from '../../core/services/device';

type DeviceProfile = 'Child' | 'Teen' | 'Adult' | 'Admin';
type ProtectionLevel = 'standard' | 'full';

@Component({
  selector: 'app-device-setup',
  imports: [FormsModule, RouterLink],
  templateUrl: './device-setup.html',
  styleUrl: './device-setup.scss'
})
export class DeviceSetup {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deviceService = inject(DeviceService);

  deviceId = this.route.snapshot.paramMap.get('id') ?? 'unknown-device';

  deviceName = '';
  selectedProfile: DeviceProfile | null = null;
  protectionLevel: ProtectionLevel = 'standard';

  setProfile(profile: DeviceProfile): void {
    this.selectedProfile = profile;
  }

  setProtection(level: ProtectionLevel): void {
    this.protectionLevel = level;
  }

  finishSetup(): void {
    if (!this.deviceName.trim() || !this.selectedProfile) {
      return;
    }

    const name = this.deviceName.trim();

    const setupData = {
      id: this.deviceId,
      name,
      profile: this.selectedProfile,
      protectionLevel: this.protectionLevel
    };

    localStorage.setItem(
      `fornect-device-setup-${this.deviceId}`,
      JSON.stringify(setupData)
    );

    this.deviceService.updateDevice(
      this.deviceId,
      {
        name,
        profile: this.selectedProfile,
        protectionLevel: this.protectionLevel
      }
    );

    this.router.navigate(['/devices', this.deviceId]);
  }
}
