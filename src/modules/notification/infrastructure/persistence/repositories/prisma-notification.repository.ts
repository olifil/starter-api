import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { Notification as PrismaNotification, Prisma } from '@prisma/client';
import { Notification } from '../../../core/domain/entities/notification.entity';
import {
  INotificationRepository,
  NotificationFilters,
} from '../../../core/domain/repositories/notification.repository.interface';
import { NotificationStatus } from '../../../core/domain/value-objects/notification-status.vo';
import { NotificationType } from '../../../core/domain/value-objects/notification-type.vo';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  private readonly logger = new Logger(PrismaNotificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(notification: Notification): Promise<Notification> {
    const data = this.toPrisma(notification);
    const saved = await this.prisma.notification.create({ data });
    this.logger.log(`Notification created: ${saved.id}`);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    return notification ? this.toDomain(notification) : null;
  }

  async findByUserId(
    userId: string,
    page: number,
    pageSize: number,
    filters?: NotificationFilters,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.channel && { channel: filters.channel }),
      ...(filters?.status && { status: filters.status }),
    };

    const [prismaNotifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const notifications = prismaNotifications.map((n) => this.toDomain(n));
    return { notifications, total };
  }

  async update(notification: Notification): Promise<Notification> {
    const data = this.toPrisma(notification);
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data,
    });
    this.logger.log(`Notification updated: ${notification.id}`);
    return this.toDomain(updated);
  }

  async countByUserAndStatus(userId: string, status: NotificationStatus): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, status },
    });
  }

  private toDomain(prisma: PrismaNotification): Notification {
    return new Notification({
      id: prisma.id,
      userId: prisma.userId,
      type: new NotificationType(prisma.type),
      channel: prisma.channel,
      status: prisma.status,
      subject: prisma.subject ?? undefined,
      body: prisma.body,
      metadata: (prisma.metadata as Record<string, unknown>) ?? undefined,
      sentAt: prisma.sentAt ?? undefined,
      readAt: prisma.readAt ?? undefined,
      failedAt: prisma.failedAt ?? undefined,
      failureReason: prisma.failureReason ?? undefined,
      retryCount: prisma.retryCount,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  private toPrisma(notification: Notification) {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type.value,
      channel: notification.channel,
      status: notification.status,
      subject: notification.subject ?? null,
      body: notification.body,
      metadata:
        notification.metadata !== undefined
          ? (notification.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      sentAt: notification.sentAt ?? null,
      readAt: notification.readAt ?? null,
      failedAt: notification.failedAt ?? null,
      failureReason: notification.failureReason ?? null,
      retryCount: notification.retryCount,
    };
  }
}
