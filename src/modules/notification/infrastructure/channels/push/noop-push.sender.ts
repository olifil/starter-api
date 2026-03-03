import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelSenderPort,
  SendNotificationPayload,
} from '../../../core/domain/ports/channel-sender.port';
import { NotificationChannel } from '../../../core/domain/value-objects/notification-channel.vo';

@Injectable()
export class NoopPushSender implements ChannelSenderPort {
  readonly channel: NotificationChannel = 'PUSH';
  private readonly logger = new Logger(NoopPushSender.name);

  send(payload: SendNotificationPayload): Promise<void> {
    this.logger.warn(`Push channel not implemented. Notification to ${payload.to} discarded.`);
    return Promise.resolve();
  }

  isEnabled(): boolean {
    return false;
  }

  defaultUserPreference(): boolean {
    // Requiert un numéro de téléphone et un push token device — toujours false à l'inscription
    return false;
  }
}
