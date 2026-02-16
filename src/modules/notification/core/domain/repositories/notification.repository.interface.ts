import { Notification } from '../entities/notification.entity';
import { NotificationStatus } from '../value-objects/notification-status.vo';

export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ notifications: Notification[]; total: number }>;
  update(notification: Notification): Promise<Notification>;
  countByUserAndStatus(userId: string, status: NotificationStatus): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
