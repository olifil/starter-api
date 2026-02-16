import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel } from '../../core/domain/value-objects/notification-channel.vo';

export interface NotificationJobData {
  notificationId: string;
  userId: string;
  type: string;
  channel: NotificationChannel;
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationProducer {
  private readonly logger = new Logger(NotificationProducer.name);

  constructor(@InjectQueue('notifications') private readonly queue: Queue) {}

  async enqueue(data: NotificationJobData): Promise<void> {
    const QUEUE_TIMEOUT_MS = 5000;

    const job = await Promise.race([
      this.queue.add(`send-${data.channel}`, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Queue timeout after ${QUEUE_TIMEOUT_MS}ms — Redis may be unavailable`),
            ),
          QUEUE_TIMEOUT_MS,
        ),
      ),
    ]);

    this.logger.debug(
      `Job ${job.id} enqueued: ${data.type} via ${data.channel} to user ${data.userId}`,
    );
  }
}
