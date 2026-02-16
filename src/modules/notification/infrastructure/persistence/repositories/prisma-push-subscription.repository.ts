import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { PushSubscription as PrismaPushSubscription } from '@prisma/client';
import { PushSubscription } from '../../../core/domain/entities/push-subscription.entity';
import { IPushSubscriptionRepository } from '../../../core/domain/repositories/push-subscription.repository.interface';

@Injectable()
export class PrismaPushSubscriptionRepository implements IPushSubscriptionRepository {
  private readonly logger = new Logger(PrismaPushSubscriptionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(subscription: PushSubscription): Promise<PushSubscription> {
    const existing = await this.prisma.pushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      const updated = await this.prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh: subscription.p256dh, auth: subscription.auth },
      });
      this.logger.debug(`Push subscription updated for user ${subscription.userId}`);
      return this.toDomain(updated);
    }

    const created = await this.prisma.pushSubscription.create({
      data: {
        id: subscription.id,
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    });
    this.logger.log(`Push subscription created for user ${subscription.userId}`);
    return this.toDomain(created);
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return subs.map((s) => this.toDomain(s));
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    this.logger.log(`Push subscription deleted (endpoint: ${endpoint.slice(0, 50)}...)`);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId } });
    this.logger.log(`All push subscriptions deleted for user ${userId}`);
  }

  private toDomain(prisma: PrismaPushSubscription): PushSubscription {
    return new PushSubscription({
      id: prisma.id,
      userId: prisma.userId,
      endpoint: prisma.endpoint,
      p256dh: prisma.p256dh,
      auth: prisma.auth,
      createdAt: prisma.createdAt,
    });
  }
}
