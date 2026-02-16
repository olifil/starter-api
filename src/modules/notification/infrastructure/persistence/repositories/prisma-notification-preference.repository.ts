import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { NotificationPreference as PrismaNotificationPreference } from '@prisma/client';
import { NotificationPreference } from '../../../core/domain/entities/notification-preference.entity';
import { INotificationPreferenceRepository } from '../../../core/domain/repositories/notification-preference.repository.interface';
import { NotificationChannel } from '../../../core/domain/value-objects/notification-channel.vo';

@Injectable()
export class PrismaNotificationPreferenceRepository implements INotificationPreferenceRepository {
  private readonly logger = new Logger(PrismaNotificationPreferenceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(preference: NotificationPreference): Promise<NotificationPreference> {
    const data = this.toPrisma(preference);
    const saved = await this.prisma.notificationPreference.create({ data });
    this.logger.log(`Notification preference created: ${saved.id}`);
    return this.toDomain(saved);
  }

  async findByUserId(userId: string): Promise<NotificationPreference[]> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { channel: 'asc' },
    });
    return preferences.map((p) => this.toDomain(p));
  }

  async findByUserIdAndChannel(
    userId: string,
    channel: NotificationChannel,
  ): Promise<NotificationPreference | null> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_channel: { userId, channel } },
    });
    return preference ? this.toDomain(preference) : null;
  }

  async upsert(preference: NotificationPreference): Promise<NotificationPreference> {
    const data = this.toPrisma(preference);
    const upserted = await this.prisma.notificationPreference.upsert({
      where: {
        userId_channel: {
          userId: preference.userId,
          channel: preference.channel,
        },
      },
      update: { enabled: preference.enabled },
      create: data,
    });
    this.logger.log(`Notification preference upserted: ${preference.userId}/${preference.channel}`);
    return this.toDomain(upserted);
  }

  private toDomain(prisma: PrismaNotificationPreference): NotificationPreference {
    return new NotificationPreference({
      id: prisma.id,
      userId: prisma.userId,
      channel: prisma.channel,
      enabled: prisma.enabled,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  private toPrisma(preference: NotificationPreference) {
    return {
      id: preference.id,
      userId: preference.userId,
      channel: preference.channel,
      enabled: preference.enabled,
    };
  }
}
