import { ICommand } from '@nestjs/cqrs';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';

export class SendNotificationCommand implements ICommand {
  constructor(
    public readonly userIds: string[],
    public readonly type: string,
    public readonly channels: NotificationChannel[],
    public readonly variables: Record<string, unknown> = {},
    public readonly locale: string = 'fr',
  ) {}
}
