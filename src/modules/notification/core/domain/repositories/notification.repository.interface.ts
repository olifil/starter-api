import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../value-objects/notification-channel.vo';
import { NotificationStatus } from '../value-objects/notification-status.vo';

export interface NotificationFilters {
  type?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(
    userId: string,
    page: number,
    pageSize: number,
    filters?: NotificationFilters,
  ): Promise<{ notifications: Notification[]; total: number }>;
  update(notification: Notification): Promise<Notification>;
  countByUserAndStatus(userId: string, status: NotificationStatus): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
