import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  DeviceSchedule,
  DeviceService
} from '../../core/services/device';

@Component({
  selector: 'app-schedule',
  imports: [RouterLink, FormsModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss'
})
export class Schedule {
  private readonly route = inject(ActivatedRoute);
  private readonly deviceService = inject(DeviceService);

  deviceId = this.route.snapshot.paramMap.get('id') ?? 'amar-iphone';

  device =
    this.deviceService.getDevice(this.deviceId) ??
    this.deviceService.getDevice('amar-iphone')!;

  deviceName = this.device.name;

  enabled = this.device.schedule.enabled;
  saved = false;

  hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0')
  );

  startHour = this.device.schedule.startHour;
  startMinute = this.device.schedule.startMinute;

  endHour = this.device.schedule.endHour;
  endMinute = this.device.schedule.endMinute;

  days = structuredClone(this.device.schedule.days);

  toggleDay(index: number): void {
    this.days[index].selected = !this.days[index].selected;
    this.saved = false;
  }

  toggleSchedule(): void {
    this.enabled = !this.enabled;
    this.saved = false;
  }

  saveSchedule(): void {
    const schedule: DeviceSchedule = {
      enabled: this.enabled,
      startHour: this.startHour,
      startMinute: this.startMinute,
      endHour: this.endHour,
      endMinute: this.endMinute,
      days: structuredClone(this.days)
    };

    this.deviceService.updateSchedule(
      this.deviceId,
      schedule
    );

    this.saved = true;
  }

  get startTime(): string {
    return `${this.startHour}:${this.startMinute}`;
  }

  get endTime(): string {
    return `${this.endHour}:${this.endMinute}`;
  }

  get selectedDaysText(): string {
    const selected = this.days
      .filter(day => day.selected)
      .map(day => day.label);

    if (selected.length === 7) {
      return 'every day';
    }

    if (
      selected.length === 5 &&
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].every(day =>
        selected.includes(day)
      )
    ) {
      return 'Monday to Friday';
    }

    if (selected.length === 0) {
      return 'no days selected';
    }

    return selected.join(', ');
  }

  get scheduleSummary(): string {
    if (!this.enabled) {
      return 'Bedtime schedule is disabled.';
    }

    return `Internet will be paused from ${this.startTime} until ${this.endTime}, ${this.selectedDaysText}.`;
  }
}
