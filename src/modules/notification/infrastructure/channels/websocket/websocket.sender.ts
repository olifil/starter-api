import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelSenderPort,
  SendNotificationPayload,
} from '../../../core/domain/ports/channel-sender.port';
import { NotificationChannel } from '../../../core/domain/value-objects/notification-channel.vo';
import { NotificationGateway } from '../../../interface/websocket/notification.gateway';

@Injectable()
export class WebSocketSender implements ChannelSenderPort {
  readonly channel: NotificationChannel = 'WEBSOCKET';
  private readonly logger = new Logger(WebSocketSender.name);
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly gateway: NotificationGateway,
  ) {
    this.enabled = this.configService.get<boolean>('notification.websocket.enabled', false);

    if (this.enabled) {
      this.logger.log('WebSocket channel initialized');
    } else {
      this.logger.warn('WebSocket channel disabled (WS_ENABLED=false)');
    }
  }

  send(payload: SendNotificationPayload): Promise<void> {
    if (!this.enabled) {
      throw new Error('WebSocket channel is not enabled');
    }

    // payload.to = userId
    this.gateway.sendToUser(payload.to, {
      subject: payload.subject,
      body: payload.body,
      metadata: payload.metadata,
    });

    this.logger.debug(`WebSocket notification sent to user ${payload.to}`);
    return Promise.resolve();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  defaultUserPreference(): boolean {
    return this.isEnabled();
  }
}
