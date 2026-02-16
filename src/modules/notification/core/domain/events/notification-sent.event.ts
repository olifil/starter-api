import { NotificationChannel } from '../value-objects/notification-channel.vo';

export class NotificationSentEvent {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly channel: NotificationChannel,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
