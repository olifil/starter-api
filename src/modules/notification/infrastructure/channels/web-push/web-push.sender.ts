import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import {
  ChannelSenderPort,
  SendNotificationPayload,
} from '../../../core/domain/ports/channel-sender.port';
import { NotificationChannel } from '../../../core/domain/value-objects/notification-channel.vo';

@Injectable()
export class WebPushSender implements ChannelSenderPort {
  readonly channel: NotificationChannel = 'WEB_PUSH';
  private readonly logger = new Logger(WebPushSender.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('notification.webPush.enabled', false);

    if (this.enabled) {
      const publicKey = this.configService.get<string>('notification.webPush.publicKey')!;
      const privateKey = this.configService.get<string>('notification.webPush.privateKey')!;
      const subject = this.configService.get<string>(
        'notification.webPush.subject',
        'mailto:admin@starter.local',
      );

      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('Web-Push channel initialized (VAPID)');
    } else {
      this.logger.warn('Web-Push channel disabled (VAPID keys not configured)');
    }
  }

  async send(payload: SendNotificationPayload): Promise<void> {
    if (!this.enabled) {
      throw new Error('Web-Push channel is not enabled');
    }

    // payload.to contient l'endpoint de la subscription
    // payload.metadata contient p256dh et auth
    const subscription: webPush.PushSubscription = {
      endpoint: payload.to,
      keys: {
        p256dh: (payload.metadata?.['p256dh'] as string) || '',
        auth: (payload.metadata?.['auth'] as string) || '',
      },
    };

    const pushPayload = JSON.stringify({
      title: payload.subject || 'Notification',
      body: payload.body,
      ...(payload.metadata?.['data'] ? { data: payload.metadata['data'] } : {}),
    });

    await webPush.sendNotification(subscription, pushPayload);
    this.logger.debug(`Web-Push sent to endpoint ${payload.to.slice(0, 50)}...`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
