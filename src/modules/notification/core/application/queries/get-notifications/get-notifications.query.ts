import { IQuery } from '@nestjs/cqrs';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationStatus } from '../../../domain/value-objects/notification-status.vo';

export class GetNotificationsQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 10,
    public readonly type?: string,
    public readonly channel?: NotificationChannel,
    public readonly status?: NotificationStatus,
  ) {}
}
