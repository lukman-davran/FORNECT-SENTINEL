import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  DeviceProfile,
  DeviceService
} from '../../core/services/device';

@Component({
  selector: 'app-device-details',
  imports: [RouterLink],
  templateUrl: './device-details.html',
  styleUrl: './device-details.scss'
})
export class DeviceDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly deviceService = inject(DeviceService);

  deviceId = this.route.snapshot.paramMap.get('id') ?? 'amar-iphone';

  device =
    this.deviceService.getDevice(this.deviceId) ??
    this.deviceService.getDevice('amar-iphone')!;

  profilePickerOpen = this.device.profile === null;
  currentProfile: DeviceProfile = this.device.profile;

  get overrideActive(): boolean {
    return !!this.device.overrideUntil &&
      this.device.overrideUntil > Date.now();
  }

  get overrideMinutes(): number {
    if (!this.overrideActive || !this.device.overrideUntil) {
      return 0;
    }

    return Math.max(
      1,
      Math.ceil(
        (this.device.overrideUntil - Date.now()) / 60000
      )
    );
  }

  allowTemporary(minutes: number): void {
    this.deviceService.setTemporaryOverride(
      this.device.id,
      minutes
    );

    this.refreshDevice();
  }

  cancelOverride(): void {
    this.deviceService.clearOverride(this.device.id);
    this.refreshDevice();
  }

  toggleProfilePicker(): void {
    this.profilePickerOpen = !this.profilePickerOpen;
  }

  setProfile(profile: Exclude<DeviceProfile, null>): void {
    this.currentProfile = profile;
    this.profilePickerOpen = false;

    this.deviceService.updateDevice(
      this.device.id,
      { profile }
    );

    this.refreshDevice();
  }

  get protectionLabel(): string {
    switch (this.device.protectionLevel) {
      case 'full':
        return 'Full Protection';

      case 'standard':
        return 'Standard Protection';

      default:
        return 'Needs setup';
    }
  }

  get scheduleLabel(): string {
    if (!this.device.schedule.enabled) {
      return 'No schedule';
    }

    return `${this.device.schedule.startHour}:${this.device.schedule.startMinute} - ${this.device.schedule.endHour}:${this.device.schedule.endMinute}`;
  }

  private refreshDevice(): void {
    const updated = this.deviceService.getDevice(this.device.id);

    if (updated) {
      this.device = updated;
      this.currentProfile = updated.profile;
    }
  }
}
