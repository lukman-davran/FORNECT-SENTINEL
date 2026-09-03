import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  FornectNotification,
  NotificationService
} from '../../core/services/notification';

import {
  TranslatePipe
} from '../../shared/pipes/translate';

@Component({
  selector: 'app-notifications',
  imports: [
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications {
  private readonly notificationService =
    inject(NotificationService);

  notifications: FornectNotification[] =
    this.notificationService.getNotifications();

  get unreadCount(): number {
    return this.notifications.filter(
      notification => !notification.read
    ).length;
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
    this.refresh();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
    this.refresh();
  }

  private refresh(): void {
    this.notifications =
      this.notificationService.getNotifications();
  }
}
