import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';
import { ChannelSenderPort, CHANNEL_SENDERS } from '../../core/domain/ports/channel-sender.port';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../core/domain/repositories/notification.repository.interface';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '../../core/domain/repositories/push-subscription.repository.interface';
import { NotificationJobData } from './notification.producer';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Processor('notifications')
export class NotificationConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    @Inject(CHANNEL_SENDERS)
    private readonly channelSenders: ChannelSenderPort[],
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptionRepository: IPushSubscriptionRepository,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId, channel, to, subject, body, metadata } = job.data;

    this.logger.debug(`Processing job ${job.id}: notification ${notificationId} via ${channel}`);

    const sender = this.channelSenders.find((s) => s.channel === channel && s.isEnabled());

    if (!sender) {
      this.logger.warn(`No enabled sender found for channel ${channel}`);
      await this.markNotificationFailed(notificationId, `No enabled sender for channel ${channel}`);
      return;
    }

    try {
      if (channel === 'WEB_PUSH') {
        // Pour WEB_PUSH, `to` contient le userId — résoudre les souscriptions réelles
        const subscriptions = await this.pushSubscriptionRepository.findByUserId(to);

        if (subscriptions.length === 0) {
          this.logger.debug(`No push subscriptions found for user ${to}, skipping`);
          await this.markNotificationSent(notificationId, job.data.userId, channel);
          return;
        }

        for (const sub of subscriptions) {
          await sender.send({
            to: sub.endpoint,
            subject,
            body,
            metadata: { ...metadata, p256dh: sub.p256dh, auth: sub.auth },
          });
        }
      } else {
        await sender.send({ to, subject, body, metadata });
      }

      await this.markNotificationSent(notificationId, job.data.userId, channel);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send notification ${notificationId} via ${channel}: ${err.message}`,
        err.stack,
      );

      // Si c'est la dernière tentative, marquer comme échoué
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        await this.markNotificationFailed(notificationId, err.message, job.data.userId, channel);
      }

      throw error; // BullMQ va retenter automatiquement
    }
  }

  private async markNotificationSent(
    notificationId: string,
    userId: string,
    channel: string,
  ): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (notification) {
      notification.markAsSent();
      await this.notificationRepository.update(notification);
      for (const event of notification.domainEvents) {
        this.eventBus.publish(event);
      }
      notification.clearDomainEvents();
    }
    await this.matomoService.trackNotificationSent(userId, channel);
  }

  private async markNotificationFailed(
    notificationId: string,
    reason: string,
    userId: string,
    channel: string,
  ): Promise<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (notification) {
      notification.markAsFailed(reason);
      await this.notificationRepository.update(notification);
      for (const event of notification.domainEvents) {
        this.eventBus.publish(event);
      }
      notification.clearDomainEvents();
    }
    await this.matomoService.trackNotificationFailed(userId, channel);
  }
}
