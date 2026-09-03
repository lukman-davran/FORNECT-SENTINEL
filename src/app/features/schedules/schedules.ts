import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DeviceService,
  FornectNetworkDevice
} from '../../core/services/device';

import {
  scheduleRangeLabel
} from '../../core/services/schedule';

import {
  LanguageService
} from '../../core/services/language';

import {
  TranslatePipe
} from '../../shared/pipes/translate';

@Component({
  selector: 'app-schedules',
  imports: [
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './schedules.html',
  styleUrl: './schedules.scss'
})
export class Schedules {
  private readonly deviceService =
    inject(DeviceService);

  private readonly languageService =
    inject(LanguageService);

  get devices(): FornectNetworkDevice[] {
    return this.deviceService.devices();
  }

  get activeSchedules(): number {
    return this.devices
      .filter(device => device.schedule.enabled)
      .length;
  }

  get disabledSchedules(): number {
    return this.devices.length -
      this.activeSchedules;
  }

  getScheduleLabel(
    device: FornectNetworkDevice
  ): string {
    if (!device.schedule.enabled) {
      return this.languageService.t(
        'schedules.notScheduled'
      );
    }

    if (device.schedule.mode === 'perDay') {
      return this.languageService.t(
        'schedules.perDay'
      );
    }

    return scheduleRangeLabel(device.schedule);
  }

  getDaysLabel(
    device: FornectNetworkDevice
  ): string {
    if (!device.schedule.enabled) {
      return this.languageService.t(
        'schedules.scheduleDisabled'
      );
    }

    const selected = device.schedule.days
      .filter(day => day.selected)
      .map(day => day.label);

    if (selected.length === 7) {
      return this.languageService.t(
        'schedules.everyDay'
      );
    }

    if (
      selected.length === 5 &&
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        .every(day => selected.includes(day))
    ) {
      return this.languageService.t(
        'schedules.mondayFriday'
      );
    }

    return selected
      .map(day => this.getDayLabel(day))
      .join(' · ');
  }

  getProfileLabel(
    device: FornectNetworkDevice
  ): string {
    switch (device.profile) {
      case 'Child':
        return this.languageService.t(
          'devices.childProfile'
        );

      case 'Teen':
        return this.languageService.t(
          'devices.teenProfile'
        );

      case 'Adult':
        return this.languageService.t(
          'devices.adultProfile'
        );

      case 'Admin':
        return this.languageService.t(
          'devices.adminProfile'
        );

      default:
        return this.languageService.t(
          'devices.noProfile'
        );
    }
  }

  private getDayLabel(day: string): string {
    const keys: Record<string, string> = {
      Sun: 'schedule.daySun',
      Mon: 'schedule.dayMon',
      Tue: 'schedule.dayTue',
      Wed: 'schedule.dayWed',
      Thu: 'schedule.dayThu',
      Fri: 'schedule.dayFri',
      Sat: 'schedule.daySat'
    };

    return this.languageService.t(
      keys[day] ?? day
    );
  }
}
