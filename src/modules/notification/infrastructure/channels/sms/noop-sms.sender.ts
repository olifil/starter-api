import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelSenderPort,
  SendNotificationPayload,
} from '../../../core/domain/ports/channel-sender.port';
import { NotificationChannel } from '../../../core/domain/value-objects/notification-channel.vo';

@Injectable()
export class NoopSmsSender implements ChannelSenderPort {
  readonly channel: NotificationChannel = 'SMS';
  private readonly logger = new Logger(NoopSmsSender.name);

  send(payload: SendNotificationPayload): Promise<void> {
    this.logger.warn(`SMS channel not implemented. Message to ${payload.to} discarded.`);
    return Promise.resolve();
  }

  isEnabled(): boolean {
    return false;
  }

  defaultUserPreference(): boolean {
    // Requiert un numéro de téléphone — toujours false jusqu'à ce que l'utilisateur en fournisse un
    return false;
  }
}
