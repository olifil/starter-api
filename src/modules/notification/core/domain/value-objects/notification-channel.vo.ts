import { NotificationChannel as PrismaNotificationChannel } from '@prisma/client';

export class InvalidNotificationChannelException extends Error {
  constructor(channel: string) {
    super(`Canal de notification invalide: ${channel}`);
    this.name = 'InvalidNotificationChannelException';
  }
}

export type NotificationChannel = PrismaNotificationChannel;

export const NotificationChannelValues: readonly NotificationChannel[] = [
  'EMAIL',
  'SMS',
  'PUSH',
  'WEB_PUSH',
  'WEBSOCKET',
] as const;

export function isValidNotificationChannel(value: string): value is NotificationChannel {
  return NotificationChannelValues.includes(value as NotificationChannel);
}

export function validateNotificationChannel(value: string): NotificationChannel {
  if (!isValidNotificationChannel(value)) {
    throw new InvalidNotificationChannelException(value);
  }
  return value;
}
