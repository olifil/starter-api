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
  /**
   * Indique si la préférence par défaut pour un nouvel utilisateur doit être `true`.
   * Combine la disponibilité serveur (`isEnabled`) et les prérequis côté utilisateur.
   * Ex : SMS nécessite un numéro de téléphone → false même si le serveur est configuré.
   */
  defaultUserPreference(): boolean;
}

export const CHANNEL_SENDERS = Symbol('CHANNEL_SENDERS');
