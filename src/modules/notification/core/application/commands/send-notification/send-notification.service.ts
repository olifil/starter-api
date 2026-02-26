import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendNotificationCommand } from './send-notification.command';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/value-objects/notification-type.vo';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '../../../domain/repositories/notification-preference.repository.interface';
import { ChannelSenderPort, CHANNEL_SENDERS } from '../../../domain/ports/channel-sender.port';
import { ITemplateRenderer, TEMPLATE_RENDERER } from '../../services/template-renderer.service';
import { NotificationProducer } from '../../../../infrastructure/queue/notification.producer';
import { NotificationResponseDto } from '../../dtos/notification-response.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';

@Injectable()
@CommandHandler(SendNotificationCommand)
export class SendNotificationService implements ICommandHandler<SendNotificationCommand> {
  private readonly logger = new Logger(SendNotificationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: INotificationPreferenceRepository,
    @Inject(CHANNEL_SENDERS)
    private readonly channelSenders: ChannelSenderPort[],
    @Inject(TEMPLATE_RENDERER)
    private readonly templateRenderer: ITemplateRenderer,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly producer: NotificationProducer,
  ) {}

  async execute(command: SendNotificationCommand): Promise<NotificationResponseDto[]> {
    const { userIds, type, channels, variables, locale } = command;
    const notificationType = new NotificationType(type);
    const results: NotificationResponseDto[] = [];

    // Résoudre la liste des utilisateurs
    const users =
      userIds.length === 0
        ? (await this.userRepository.findAll(1, Number.MAX_SAFE_INTEGER)).users
        : await this.userRepository.findByIds(userIds);

    if (users.length === 0) {
      this.logger.warn('No users found for notification');
      return results;
    }

    for (const user of users) {
      for (const channel of channels) {
        // Vérifier que le canal est activé côté serveur
        const sender = this.channelSenders.find((s) => s.channel === channel);
        if (!sender || !sender.isEnabled()) {
          this.logger.debug(`Channel ${channel} is disabled, skipping`);
          continue;
        }

        // Vérifier les préférences utilisateur
        const preference = await this.preferenceRepository.findByUserIdAndChannel(user.id, channel);
        if (preference && !preference.enabled) {
          this.logger.debug(`User ${user.id} has disabled ${channel}, skipping`);
          continue;
        }

        // Rendre le template
        const rendered = this.templateRenderer.render(
          notificationType.value,
          channel,
          locale,
          variables,
        );

        // Créer l'entité notification
        const notification = new Notification({
          userId: user.id,
          type: notificationType,
          channel,
          subject: rendered.subject,
          body: rendered.body,
          metadata: variables,
        });

        // Persister
        const saved = await this.notificationRepository.save(notification);
        saved.markAsQueued();
        await this.notificationRepository.update(saved);

        // Déterminer le destinataire selon le canal
        const to = this.resolveRecipient(channel, user, command.recipientEmailOverride);

        // Enqueue pour traitement async — fallback direct si la queue est indisponible
        try {
          await this.producer.enqueue({
            notificationId: saved.id,
            userId: user.id,
            type: notificationType.value,
            channel,
            to,
            subject: rendered.subject,
            body: rendered.body,
            metadata: variables,
          });
        } catch (queueError) {
          this.logger.warn(
            `Queue unavailable for ${channel}, falling back to direct send: ${(queueError as Error).message}`,
          );
          try {
            await sender.send({
              to,
              subject: rendered.subject,
              body: rendered.body,
              metadata: variables,
            });
            saved.markAsSent();
            await this.notificationRepository.update(saved);
          } catch (directError) {
            this.logger.error(
              `Direct send failed for ${channel}: ${(directError as Error).message}`,
            );
            saved.markAsFailed((directError as Error).message);
            await this.notificationRepository.update(saved);
          }
        }

        results.push(NotificationResponseDto.fromDomain(saved));
      }
    }

    return results;
  }

  private resolveRecipient(
    channel: string,
    user: { id: string; email: { value: string } },
    recipientEmailOverride?: string,
  ): string {
    switch (channel) {
      case 'EMAIL':
        return recipientEmailOverride ?? user.email.value;
      case 'SMS':
        return ''; // TODO: user.phoneNumber
      case 'PUSH':
      case 'WEB_PUSH':
        return user.id; // Résolu par le consumer via PushSubscription
      case 'WEBSOCKET':
        return user.id;
      default:
        return user.id;
    }
  }
}
