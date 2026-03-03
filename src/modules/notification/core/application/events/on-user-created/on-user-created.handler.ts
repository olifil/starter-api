import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import { SendNotificationCommand } from '../../commands/send-notification/send-notification.command';
import {
  CHANNEL_SENDERS,
  ChannelSenderPort,
} from '../../../domain/ports/channel-sender.port';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '../../../domain/repositories/notification-preference.repository.interface';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';

@Injectable()
@EventsHandler(UserCreatedEvent)
export class OnUserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(OnUserCreatedHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    @Inject(CHANNEL_SENDERS)
    private readonly channelSenders: ChannelSenderPort[],
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: INotificationPreferenceRepository,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`Sending welcome notification to user ${event.userId}`);

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3000');
    const verificationPath = this.configService.get<string>(
      'app.emailVerificationPath',
      '/verify-email',
    );
    const verificationLink = event.verificationToken
      ? `${frontendUrl}${verificationPath}?token=${event.verificationToken}`
      : undefined;

    await Promise.all([
      this.commandBus.execute(
        new SendNotificationCommand(
          [event.userId],
          'welcome',
          ['EMAIL'],
          { firstName: event.firstName, lastName: event.lastName, verificationLink },
          'fr',
        ),
      ),
      this.initializePreferences(event.userId),
    ]);
  }

  private async initializePreferences(userId: string): Promise<void> {
    await Promise.all(
      this.channelSenders.map((sender) =>
        this.preferenceRepository.upsert(
          new NotificationPreference({
            userId,
            channel: sender.channel,
            enabled: sender.isEnabled(),
          }),
        ),
      ),
    );
  }
}
