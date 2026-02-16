import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationChannel } from '../value-objects/notification-channel.vo';

export interface INotificationPreferenceRepository {
  save(preference: NotificationPreference): Promise<NotificationPreference>;
  findByUserId(userId: string): Promise<NotificationPreference[]>;
  findByUserIdAndChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<NotificationPreference | null>;
  upsert(preference: NotificationPreference): Promise<NotificationPreference>;
}

export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol('NOTIFICATION_PREFERENCE_REPOSITORY');
