import { NotificationStatus as PrismaNotificationStatus } from '@prisma/client';

export type NotificationStatus = PrismaNotificationStatus;

export const NotificationStatusValues: readonly NotificationStatus[] = [
  'PENDING',
  'QUEUED',
  'SENT',
  'FAILED',
  'READ',
] as const;
