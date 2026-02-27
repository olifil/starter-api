import { ICommand } from '@nestjs/cqrs';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';

export class MarkAllAsReadCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly channel?: NotificationChannel,
  ) {}
}
