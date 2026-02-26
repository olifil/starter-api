import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { EmailChangeRequestedEvent } from '@modules/auth/core/domain/events/email-change-requested.event';
import { SendNotificationCommand } from '../../commands/send-notification/send-notification.command';

@Injectable()
@EventsHandler(EmailChangeRequestedEvent)
export class OnEmailChangeRequestedHandler implements IEventHandler<EmailChangeRequestedEvent> {
  private readonly logger = new Logger(OnEmailChangeRequestedHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: EmailChangeRequestedEvent): Promise<void> {
    this.logger.log(
      `Sending email change confirmation to ${event.newEmail} for user ${event.userId}`,
    );

    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3000');
    const confirmationLink = `${frontendUrl}/confirm-email-change?token=${event.confirmationToken}`;

    await this.commandBus.execute(
      new SendNotificationCommand(
        [event.userId],
        'email-change-verification',
        ['EMAIL'],
        { firstName: event.firstName, confirmationLink, expiresIn: event.expiresIn },
        'fr',
        event.newEmail,
      ),
    );
  }
}
