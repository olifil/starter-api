import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import { SendNotificationCommand } from '../../commands/send-notification/send-notification.command';

@Injectable()
@EventsHandler(UserCreatedEvent)
export class OnUserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(OnUserCreatedHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
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

    await this.commandBus.execute(
      new SendNotificationCommand(
        [event.userId],
        'welcome',
        ['EMAIL'],
        { firstName: event.firstName, lastName: event.lastName, verificationLink },
        'fr',
      ),
    );
  }
}
