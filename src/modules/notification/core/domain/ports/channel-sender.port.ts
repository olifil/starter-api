import { NotificationChannel } from '../value-objects/notification-channel.vo';

export interface SendNotificationPayload {
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelSenderPort {
  readonly channel: NotificationChannel;
  send(payload: SendNotificationPayload): Promise<void>;
  isEnabled(): boolean;
}

export const CHANNEL_SENDERS = Symbol('CHANNEL_SENDERS');
