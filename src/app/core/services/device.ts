import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthService } from './auth';
import {
  createDays,
  DeviceSchedule,
  normalizeSchedule
} from './schedule';

export type {
  DayWindow,
  DeviceSchedule,
  ScheduleDay,
  ScheduleMode
} from './schedule';

export type DeviceProfile = 'Child' | 'Teen' | 'Adult' | 'Admin' | null;
export type ProtectionLevel = 'standard' | 'full' | 'needs-setup';
export type PairingState = 'unpaired' | 'pairing' | 'paired' | 'failed';

export interface DeviceRestrictions {
  blockAdultContent: boolean;
  blockSocialMedia: boolean;
  blockGaming: boolean;
  blockStreaming: boolean;
  blockAdsTrackers: boolean;
  safeSearch: boolean;
  youtubeRestricted: boolean;
}

export const restrictionKeys: (keyof DeviceRestrictions)[] = [
  'blockAdultContent',
  'blockSocialMedia',
  'blockGaming',
  'blockStreaming',
  'blockAdsTrackers',
  'safeSearch',
  'youtubeRestricted'
];


export interface FornectNetworkDevice {
  id: string;
  accountId: string;
  name: string;
  type: 'phone' | 'tv' | 'console' | 'unknown';
  profile: DeviceProfile;
  protectionLevel: ProtectionLevel;
  protectionEnabled?: boolean;
  protectAwayFromHome?: boolean;
  pairingState: PairingState;
  /**
   * Da li se koristi puna zaštita. Odvojeno od pairingState:
   * certifikat može ostati instaliran dok je zaštita spuštena
   * na standardnu, pa povratak na punu ne traži novu instalaciju.
   */
  useFullProtection?: boolean;
  online: boolean;
  blockedAdsToday?: number;
  overrideUntil?: number | null;
  restrictions?: DeviceRestrictions;
  alertWhenOffline?: boolean;
  schedule: DeviceSchedule;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private readonly authService = inject(AuthService);
  private readonly defaultSelectedDays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri'
  ];

  private makeSchedule(
    enabled: boolean,
    startHour: string,
    startMinute: string,
    endHour: string,
    endMinute: string
  ): DeviceSchedule {
    return {
      enabled,
      mode: 'sameEveryDay',
      startHour,
      startMinute,
      endHour,
      endMinute,
      days: createDays(
        this.defaultSelectedDays,
        startHour,
        startMinute,
        endHour,
        endMinute
      )
    };
  }

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
      schedule: this.makeSchedule(
          true,
          '21',
          '00',
          '07',
          '00'
        )
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
      schedule: this.makeSchedule(
          false,
          '22',
          '00',
          '07',
          '00'
        )
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
      schedule: this.makeSchedule(
          true,
          '22',
          '00',
          '08',
          '00'
        )
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
      schedule: this.makeSchedule(
          false,
          '21',
          '00',
          '07',
          '00'
        )
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
    this.loadDiscoveredDevicesForCurrentAccount();
    this.loadSavedDeviceSetup();
    this.loadSavedSchedules();
    this.loadSavedPairingStates();
    this.loadSavedDeviceStates();
  }

  discoverDemoDevicesForCurrentAccount(): void {
    const accountId = this.authService.currentUser()?.accountId;

    if (!accountId) {
      return;
    }

    // Ne dodaj ponovo uređaje ako su već otkriveni.
    const alreadyDiscovered = this.allDevices().some(
      device => device.accountId === accountId
    );

    if (alreadyDiscovered) {
      return;
    }

    const discoveredDevices: FornectNetworkDevice[] = [
      {
        id: `iphone-${accountId}`,
        accountId,
        name: 'iPhone',
        type: 'phone',
        profile: null,
        protectionLevel: 'needs-setup',
        pairingState: 'unpaired',
        online: true,
        schedule: this.makeSchedule(
          false,
          '21',
          '00',
          '07',
          '00'
        )
      },
      {
        id: `tv-${accountId}`,
        accountId,
        name: 'Living Room TV',
        type: 'tv',
        profile: null,
        protectionLevel: 'needs-setup',
        pairingState: 'unpaired',
        online: true,
        schedule: this.makeSchedule(
          false,
          '22',
          '00',
          '07',
          '00'
        )
      },
      {
        id: `console-${accountId}`,
        accountId,
        name: 'Game Console',
        type: 'console',
        profile: null,
        protectionLevel: 'needs-setup',
        pairingState: 'unpaired',
        online: false,
        schedule: this.makeSchedule(
          false,
          '22',
          '00',
          '08',
          '00'
        )
      },
      {
        id: `unknown-${accountId}`,
        accountId,
        name: 'New device',
        type: 'unknown',
        profile: null,
        protectionLevel: 'needs-setup',
        pairingState: 'unpaired',
        online: true,
        schedule: this.makeSchedule(
          false,
          '21',
          '00',
          '07',
          '00'
        )
      }
    ];

    this.allDevices.update(devices => [
      ...devices,
      ...discoveredDevices
    ]);

    localStorage.setItem(
      `fornect-discovered-devices-${accountId}`,
      JSON.stringify(discoveredDevices)
    );
  }

  private loadDiscoveredDevicesForCurrentAccount(): void {
    const accountId = this.authService.currentUser()?.accountId;

    if (!accountId) {
      return;
    }

    const saved = localStorage.getItem(
      `fornect-discovered-devices-${accountId}`
    );

    if (!saved) {
      return;
    }

    try {
      const discovered =
        JSON.parse(saved) as FornectNetworkDevice[];

      this.allDevices.update(devices => {
        const existingIds = new Set(
          devices.map(device => device.id)
        );

        return [
          ...devices,
          ...discovered.filter(
            device => !existingIds.has(device.id)
          )
        ];
      });
    } catch {
      localStorage.removeItem(
        `fornect-discovered-devices-${accountId}`
      );
    }
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

        const schedule = normalizeSchedule(
          JSON.parse(saved)
        );

        if (!schedule) {
          return device;
        }

        return {
          ...device,
          schedule
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

    // Promjena profila povlaci novi preset
    // ogranicenja, osim ako pozivalac salje svoja.
    const appliedChanges: Partial<FornectNetworkDevice> =
      changes.profile !== undefined &&
      changes.restrictions === undefined
        ? {
            ...changes,
            restrictions:
              this.getDefaultRestrictions(
                changes.profile
              )
          }
        : changes;

    this.allDevices.update(devices =>
      devices.map(item =>
        item.id === id &&
        item.accountId === accountId
          ? { ...item, ...appliedChanges }
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
        ...appliedChanges
      })
    );
  }

  /**
   * Podrazumijevano pratimo nestanak sa mreže samo za dječije i
   * tinejdžerske uređaje. Za TV ili roditeljski telefon to bi
   * bila samo buka, jer se oni gase svaki dan bez razloga za
   * uzbunu. Roditelj podešavanje može promijeniti po uređaju.
   */
  offlineAlertEnabled(
    device: FornectNetworkDevice
  ): boolean {
    if (device.alertWhenOffline !== undefined) {
      return device.alertWhenOffline;
    }

    return (
      device.profile === 'Child' ||
      device.profile === 'Teen'
    );
  }

  setOfflineAlert(id: string, enabled: boolean): void {
    this.updateDevice(id, {
      alertWhenOffline: enabled
    });
  }

  getDefaultRestrictions(
    profile: DeviceProfile
  ): DeviceRestrictions {
    switch (profile) {
      case 'Admin':
        return {
          blockAdultContent: false,
          blockSocialMedia: false,
          blockGaming: false,
          blockStreaming: false,
          blockAdsTrackers: false,
          safeSearch: false,
          youtubeRestricted: false
        };

      case 'Adult':
        return {
          blockAdultContent: false,
          blockSocialMedia: false,
          blockGaming: false,
          blockStreaming: false,
          blockAdsTrackers: true,
          safeSearch: false,
          youtubeRestricted: false
        };

      case 'Teen':
        return {
          blockAdultContent: true,
          blockSocialMedia: false,
          blockGaming: false,
          blockStreaming: false,
          blockAdsTrackers: true,
          safeSearch: true,
          youtubeRestricted: false
        };

      // Child i jos nedodijeljeni uredaji dobijaju
      // najstroziji preset kao sigurnu polaznu tacku.
      default:
        return {
          blockAdultContent: true,
          blockSocialMedia: true,
          blockGaming: false,
          blockStreaming: false,
          blockAdsTrackers: true,
          safeSearch: true,
          youtubeRestricted: true
        };
    }
  }

  getRestrictions(id: string): DeviceRestrictions {
    const device = this.getDevice(id);

    if (!device) {
      return this.getDefaultRestrictions(null);
    }

    return (
      device.restrictions ??
      this.getDefaultRestrictions(device.profile)
    );
  }

  usesProfileDefaults(id: string): boolean {
    const device = this.getDevice(id);

    if (!device) {
      return true;
    }

    const defaults =
      this.getDefaultRestrictions(device.profile);

    const current = this.getRestrictions(id);

    return restrictionKeys.every(
      key => current[key] === defaults[key]
    );
  }

  setRestriction(
    id: string,
    key: keyof DeviceRestrictions,
    value: boolean
  ): void {
    const current = this.getRestrictions(id);

    this.updateDevice(id, {
      restrictions: {
        ...current,
        [key]: value
      }
    });
  }

  resetRestrictions(id: string): void {
    const device = this.getDevice(id);

    if (!device) {
      return;
    }

    this.updateDevice(id, {
      restrictions:
        this.getDefaultRestrictions(device.profile)
    });
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

















