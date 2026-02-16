import { ICommand } from '@nestjs/cqrs';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';

export interface ChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
}

export class UpdatePreferencesCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly preferences: ChannelPreference[],
  ) {}
}
