import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DeviceService,
  FornectNetworkDevice
} from '../../core/services/device';

@Component({
  selector: 'app-schedules',
  imports: [RouterLink],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss'
})
export class Schedules {
  private readonly deviceService = inject(DeviceService);

  get devices(): FornectNetworkDevice[] {
    return this.deviceService.devices();
  }

  get activeSchedules(): number {
    return this.devices.filter(device => device.schedule.enabled).length;
  }

  get disabledSchedules(): number {
    return this.devices.length - this.activeSchedules;
  }

  getScheduleLabel(device: FornectNetworkDevice): string {
    if (!device.schedule.enabled) {
      return 'Not scheduled';
    }

    return `${device.schedule.startHour}:${device.schedule.startMinute} – ${device.schedule.endHour}:${device.schedule.endMinute}`;
  }

  getDaysLabel(device: FornectNetworkDevice): string {
    if (!device.schedule.enabled) {
      return 'Schedule disabled';
    }

    const selected = device.schedule.days
      .filter(day => day.selected)
      .map(day => day.label);

    if (selected.length === 7) {
      return 'Every day';
    }

    if (
      selected.length === 5 &&
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(day =>
        selected.includes(day)
      )
    ) {
      return 'Monday – Friday';
    }

    return selected.join(' · ');
  }
}
