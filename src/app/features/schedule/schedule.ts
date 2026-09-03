import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import { DeviceService } from '../../core/services/device';

import {
  dayRangeLabel,
  DeviceSchedule,
  ScheduleDay,
  ScheduleMode
} from '../../core/services/schedule';

import {
  LanguageService
} from '../../core/services/language';

import {
  TranslatePipe
} from '../../shared/pipes/translate';

@Component({
  selector: 'app-schedule',
  imports: [
    RouterLink,
    FormsModule,
    TranslatePipe
  ],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss'
})
export class Schedule {
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

  enabled = this.device.schedule.enabled;
  mode: ScheduleMode = this.device.schedule.mode;
  saved = false;

  hours = Array.from(
    { length: 24 },
    (_, i) => i.toString().padStart(2, '0')
  );

  minutes = Array.from(
    { length: 60 },
    (_, i) => i.toString().padStart(2, '0')
  );

  startHour = this.device.schedule.startHour;
  startMinute = this.device.schedule.startMinute;

  endHour = this.device.schedule.endHour;
  endMinute = this.device.schedule.endMinute;

  days: ScheduleDay[] = structuredClone(
    this.device.schedule.days
  );

  get selectedDays(): ScheduleDay[] {
    return this.days.filter(day => day.selected);
  }

  setMode(mode: ScheduleMode): void {
    if (this.mode === mode) {
      return;
    }

    // Prelaz na vrijeme po danu kreće od zajedničkog
    // vremena, da korisnik mijenja samo ono što treba.
    if (mode === 'perDay') {
      this.days = this.days.map(day => ({
        ...day,
        startHour: this.startHour,
        startMinute: this.startMinute,
        endHour: this.endHour,
        endMinute: this.endMinute
      }));
    }

    this.mode = mode;
    this.saved = false;
  }

  toggleDay(index: number): void {
    this.days[index].selected =
      !this.days[index].selected;

    this.saved = false;
  }

  markChanged(): void {
    this.saved = false;
  }

  saveSchedule(): void {
    const schedule: DeviceSchedule = {
      enabled: this.enabled,
      mode: this.mode,
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

  toggleSchedule(): void {
    this.enabled = !this.enabled;
    this.saved = false;
  }

  dayRange(day: ScheduleDay): string {
    return dayRangeLabel(day);
  }

  get startTime(): string {
    return `${this.startHour}:${this.startMinute}`;
  }

  get endTime(): string {
    return `${this.endHour}:${this.endMinute}`;
  }

  getDayLabel(day: string): string {
    const keys: Record<string, string> = {
      Sun: 'schedule.daySun',
      Mon: 'schedule.dayMon',
      Tue: 'schedule.dayTue',
      Wed: 'schedule.dayWed',
      Thu: 'schedule.dayThu',
      Fri: 'schedule.dayFri',
      Sat: 'schedule.daySat'
    };

    return this.languageService.t(keys[day] ?? day);
  }

  get selectedDaysText(): string {
    const selected = this.selectedDays.map(
      day => day.label
    );

    if (selected.length === 7) {
      return this.languageService.t(
        'schedule.everyDay'
      );
    }

    if (
      selected.length === 5 &&
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        .every(day => selected.includes(day))
    ) {
      return this.languageService.t(
        'schedule.mondayToFriday'
      );
    }

    if (selected.length === 0) {
      return this.languageService.t(
        'schedule.noDays'
      );
    }

    return selected
      .map(day => this.getDayLabel(day))
      .join(', ');
  }

  get scheduleSummary(): string {
    if (!this.enabled) {
      return this.languageService.t(
        'schedule.disabledSummary'
      );
    }

    if (this.mode === 'perDay') {
      if (!this.selectedDays.length) {
        return this.languageService.t(
          'schedule.noDaysSummary'
        );
      }

      return this.languageService.t(
        'schedule.perDaySummary',
        { count: this.selectedDays.length }
      );
    }

    return this.languageService.t(
      'schedule.activeSummary',
      {
        start: this.startTime,
        end: this.endTime,
        days: this.selectedDaysText
      }
    );
  }
}
