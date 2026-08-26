import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from './auth';

export type DeviceProfile = 'Child' | 'Teen' | 'Adult' | 'Admin' | null;
export type ProtectionLevel = 'standard' | 'full' | 'needs-setup';
export type PairingState = 'unpaired' | 'pairing' | 'paired' | 'failed';

export interface DeviceSchedule {
  enabled: boolean;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  days: {
    label: string;
    selected: boolean;
  }[];
}

export interface FornectNetworkDevice {
  id: string;
  accountId: string;
  name: string;
  type: 'phone' | 'tv' | 'console' | 'unknown';
  profile: DeviceProfile;
  protectionLevel: ProtectionLevel;
  pairingState: PairingState;
  online: boolean;
  overrideUntil?: number | null;
  schedule: DeviceSchedule;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private readonly authService = inject(AuthService);
  private readonly defaultDays = [
    { label: 'Mon', selected: true },
    { label: 'Tue', selected: true },
    { label: 'Wed', selected: true },
    { label: 'Thu', selected: true },
    { label: 'Fri', selected: true },
    { label: 'Sat', selected: false },
    { label: 'Sun', selected: false }
  ];

  private readonly allDevices = signal<FornectNetworkDevice[]>([
    {
      id: 'amar-iphone',
      accountId: 'account-demo-001',
      name: "Amar's iPhone",
      type: 'phone',
      profile: 'Child',
      protectionLevel: 'full',
      pairingState: 'paired',
      online: true,
      schedule: {
        enabled: true,
        startHour: '21',
        startMinute: '00',
        endHour: '07',
        endMinute: '00',
        days: structuredClone(this.defaultDays)
      }
    },
    {
      id: 'living-room-tv',
      accountId: 'account-demo-001',
      name: 'Living room TV',
      type: 'tv',
      profile: 'Adult',
      protectionLevel: 'standard',
      pairingState: 'unpaired',
      online: true,
      schedule: {
        enabled: false,
        startHour: '22',
        startMinute: '00',
        endHour: '07',
        endMinute: '00',
        days: structuredClone(this.defaultDays)
      }
    },
    {
      id: 'playstation-5',
      accountId: 'account-demo-001',
      name: 'PlayStation 5',
      type: 'console',
      profile: 'Teen',
      protectionLevel: 'standard',
      pairingState: 'unpaired',
      online: false,
      schedule: {
        enabled: true,
        startHour: '22',
        startMinute: '00',
        endHour: '08',
        endMinute: '00',
        days: structuredClone(this.defaultDays)
      }
    },
    {
      id: 'unknown-device',
      accountId: 'account-demo-001',
      name: 'Unknown device',
      type: 'unknown',
      profile: null,
      protectionLevel: 'needs-setup',
      pairingState: 'unpaired',
      online: true,
      schedule: {
        enabled: false,
        startHour: '21',
        startMinute: '00',
        endHour: '07',
        endMinute: '00',
        days: structuredClone(this.defaultDays)
      }
    }
  ]);

  readonly devices = computed(() => {
    const accountId = this.authService.currentUser()?.accountId;

    if (!accountId) {
      return [];
    }

    return this.allDevices().filter(
      device => device.accountId === accountId
    );
  });

  constructor() {
    this.loadSavedDeviceSetup();
    this.loadSavedSchedules();
    this.loadSavedPairingStates();
    this.loadSavedDeviceStates();
  }

  private loadSavedDeviceSetup(): void {
    const savedSetup = localStorage.getItem(
      'fornect-device-setup-unknown-device'
    );

    if (!savedSetup) {
      return;
    }

    const setup = JSON.parse(savedSetup);

    this.allDevices.update(devices =>
      devices.map(device =>
        device.id === 'unknown-device'
          ? {
              ...device,
              name: setup.name,
              profile: setup.profile,
              protectionLevel:
                setup.protectionLevel === 'full'
                  ? 'full'
                  : 'standard'
            }
          : device
      )
    );
  }



  private loadSavedPairingStates(): void {
    this.allDevices.update(devices =>
      devices.map(device => {
        const savedState = localStorage.getItem(
          `fornect-pairing-${device.id}`
        ) as PairingState | null;

        if (!savedState) {
          return device;
        }

        return {
          ...device,
          pairingState: savedState,
          protectionLevel:
            savedState === 'paired'
              ? 'full'
              : 'standard'
        };
      })
    );
  }
  private loadSavedSchedules(): void {
    this.allDevices.update(devices =>
      devices.map(device => {
        const saved = localStorage.getItem(
          `fornect-schedule-${device.id}`
        );

        if (!saved) {
          return device;
        }

        return {
          ...device,
          schedule: JSON.parse(saved)
        };
      })
    );
  }


  setTemporaryOverride(id: string, minutes: number): void {
    const overrideUntil = Date.now() + minutes * 60 * 1000;

    this.updateDevice(id, {
      overrideUntil
    });
  }

  clearOverride(id: string): void {
    this.updateDevice(id, {
      overrideUntil: null
    });
  }
  updateSchedule(
    id: string,
    schedule: DeviceSchedule
  ): void {
    this.allDevices.update(devices =>
      devices.map(device =>
        device.id === id
          ? { ...device, schedule }
          : device
      )
    );

    localStorage.setItem(
      `fornect-schedule-${id}`,
      JSON.stringify(schedule)
    );
  }

  private loadSavedDeviceStates(): void {
    this.allDevices.update(devices =>
      devices.map(device => {
        const saved = localStorage.getItem(
          `fornect-device-state-${device.id}`
        );

        if (!saved) {
          return device;
        }

        try {
          const changes = JSON.parse(saved);

          return {
            ...device,
            ...changes
          };
        } catch {
          return device;
        }
      })
    );
  }
  updateDevice(
    id: string,
    changes: Partial<FornectNetworkDevice>
  ): void {
    const accountId = this.authService.currentUser()?.accountId;

    if (!accountId) {
      return;
    }

    const device = this.allDevices().find(
      item =>
        item.id === id &&
        item.accountId === accountId
    );

    if (!device) {
      return;
    }

    this.allDevices.update(devices =>
      devices.map(item =>
        item.id === id &&
        item.accountId === accountId
          ? { ...item, ...changes }
          : item
      )
    );

    const storageKey = `fornect-device-state-${id}`;

    let savedChanges: Partial<FornectNetworkDevice> = {};

    const existing = localStorage.getItem(storageKey);

    if (existing) {
      try {
        savedChanges = JSON.parse(existing);
      } catch {
        savedChanges = {};
      }
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...savedChanges,
        ...changes
      })
    );
  }

  getDevice(id: string): FornectNetworkDevice | undefined {
    const accountId = this.authService.currentUser()?.accountId;

    if (!accountId) {
      return undefined;
    }

    return this.allDevices().find(
      device =>
        device.id === id &&
        device.accountId === accountId
    );
  }
}













