import { inject, Injectable } from '@angular/core';

import { AuthService } from './auth';
import { DeviceService } from './device';
import { HubService } from './hub';
import { isPausedAt } from './schedule';

export type NotificationType =
  | 'offline'
  | 'update'
  | 'protection'
  | 'capacity';

export interface FornectNotification {
  id: string;
  type: NotificationType;
  titleKey: string;
  messageKey: string;
  timeKey: string;
  params?: Record<string, string | number>;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly hubService = inject(HubService);

  private readonly capacityId = 'capacity-1';
  private readonly offlineAlertPrefix = 'device-offline-';

  getNotifications(): FornectNotification[] {
    const accountId =
      this.authService.currentUser()?.accountId;

    if (!accountId) {
      return [];
    }

    let notifications: FornectNotification[] | null = null;

    const saved = localStorage.getItem(
      this.storageKey(accountId)
    );

    if (saved) {
      try {
        notifications =
          JSON.parse(saved) as FornectNotification[];
      } catch {
        localStorage.removeItem(
          this.storageKey(accountId)
        );
      }
    }

    if (!notifications) {
      notifications =
        this.createDemoNotifications(accountId);

      this.save(accountId, notifications);
    }

    const withCapacity = this.syncCapacityNotice(
      accountId,
      notifications
    );

    return this.syncOfflineAlerts(
      accountId,
      withCapacity
    );
  }

  getUnreadCount(): number {
    return this.getNotifications()
      .filter(notification => !notification.read)
      .length;
  }

  markAsRead(id: string): void {
    const accountId =
      this.authService.currentUser()?.accountId;

    if (!accountId) {
      return;
    }

    const notifications =
      this.getNotifications().map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      );

    this.save(accountId, notifications);
  }

  markAllAsRead(): void {
    const accountId =
      this.authService.currentUser()?.accountId;

    if (!accountId) {
      return;
    }

    const notifications =
      this.getNotifications().map(notification => ({
        ...notification,
        read: true
      }));

    this.save(accountId, notifications);
  }

  /**
   * Specifikacija traži obavještenje kada se dostigne limit
   * kapaciteta uređaja. Ono se ne pravi ručno nego prati
   * stvarno stanje: pojavi se kada je limit dostignut i
   * nestane kada padne ispod limita.
   */
  private syncCapacityNotice(
    accountId: string,
    notifications: FornectNotification[]
  ): FornectNotification[] {
    const capacity = this.hubService.hub().capacity;

    const deviceCount =
      this.deviceService.devices().length;

    const limitReached =
      capacity > 0 && deviceCount >= capacity;

    const existing = notifications.some(
      notification => notification.id === this.capacityId
    );

    if (limitReached === existing) {
      return notifications;
    }

    const updated = limitReached
      ? [
          {
            id: this.capacityId,
            type: 'capacity' as const,
            titleKey: 'notifications.capacityReached',
            messageKey: 'notifications.capacityMessage',
            timeKey: 'notifications.today',
            params: { capacity },
            read: false
          },
          ...notifications
        ]
      : notifications.filter(
          notification =>
            notification.id !== this.capacityId
        );

    this.save(accountId, updated);

    return updated;
  }

  /**
   * Obavještenje da je uređaj nestao sa mreže. Kao i ono o
   * kapacitetu, prati stvarno stanje: stoji dok je uređaj
   * offline i nestane kada se vrati, umjesto da se gomila.
   *
   * Ako je uređaj nestao dok je raspored bio aktivan, poruka je
   * drugačija. To je jedini slučaj koji roditelju stvarno nešto
   * govori — uređaj je napustio zaštićenu mrežu baš u vrijeme
   * kada je pristup trebao biti pauziran. Obično gašenje uređaja
   * nije događaj i ne treba ga tako prikazivati.
   *
   * Ograničenje koje se ne smije prešutjeti: aplikacija vidi
   * samo da je uređaj nestao sa mreže. Ne može razlikovati
   * namjeru od prazne baterije, niti vidjeti šta uređaj radi
   * preko mobilnih podataka.
   */
  private syncOfflineAlerts(
    accountId: string,
    notifications: FornectNotification[]
  ): FornectNotification[] {
    const now = new Date();

    const expected =
      new Map<string, FornectNotification>();

    for (const device of this.deviceService.devices()) {
      if (
        device.online ||
        !this.deviceService.offlineAlertEnabled(device)
      ) {
        continue;
      }

      const duringSchedule = isPausedAt(
        device.schedule,
        now
      );

      const id =
        `${this.offlineAlertPrefix}${device.id}`;

      expected.set(id, {
        id,
        type: 'offline',
        titleKey: duringSchedule
          ? 'notifications.leftDuringSchedule'
          : 'notifications.deviceLeftNetwork',
        messageKey: duringSchedule
          ? 'notifications.leftDuringScheduleMessage'
          : 'notifications.deviceLeftNetworkMessage',
        timeKey: 'notifications.now',
        params: { device: device.name },
        read: false
      });
    }

    // Zadrzavamo postojeca obavjestenja da se ne izgubi
    // procitan status, a uklanjamo ona za uredjaje koji
    // su se u medjuvremenu vratili na mrezu.
    const kept = notifications.filter(notification =>
      !notification.id.startsWith(
        this.offlineAlertPrefix
      ) || expected.has(notification.id)
    );

    const added = [...expected.values()].filter(
      notification =>
        !kept.some(item => item.id === notification.id)
    );

    if (
      added.length === 0 &&
      kept.length === notifications.length
    ) {
      return notifications;
    }

    const updated = [...added, ...kept];

    this.save(accountId, updated);

    return updated;
  }

  private storageKey(accountId: string): string {
    return `fornect-notifications-v3-${accountId}`;
  }

  private save(
    accountId: string,
    notifications: FornectNotification[]
  ): void {
    localStorage.setItem(
      this.storageKey(accountId),
      JSON.stringify(notifications)
    );
  }

  private createDemoNotifications(
    accountId: string
  ): FornectNotification[] {
    if (accountId === 'account-demo-001') {
      // Obavjestenje o uredjaju van mreze se vise ne pise
      // rucno - syncOfflineAlerts ga izvodi iz stvarnog stanja.
      return [
        {
          id: 'update-1',
          type: 'update',
          titleKey: 'notifications.updateAvailable',
          messageKey: 'notifications.updateReady',
          timeKey: 'notifications.time1Hour',
          read: false
        },
        {
          id: 'protection-1',
          type: 'protection',
          titleKey: 'notifications.protectionActivity',
          messageKey: 'notifications.adsBlocked',
          timeKey: 'notifications.today',
          read: true
        }
      ];
    }

    return [
      {
        id: 'welcome-1',
        type: 'protection',
        titleKey: 'notifications.protectionActive',
        messageKey: 'notifications.networkProtected',
        timeKey: 'notifications.today',
        read: false
      },
      {
        id: 'update-1',
        type: 'update',
        titleKey: 'notifications.upToDate',
        messageKey: 'notifications.runningNormally',
        timeKey: 'notifications.today',
        read: true
      }
    ];
  }
}
