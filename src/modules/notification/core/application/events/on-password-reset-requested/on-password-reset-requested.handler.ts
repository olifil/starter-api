import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { PasswordResetRequestedEvent } from '@modules/auth/core/domain/events/password-reset-requested.event';
import { SendNotificationCommand } from '../../commands/send-notification/send-notification.command';

@Injectable()
@EventsHandler(PasswordResetRequestedEvent)
export class OnPasswordResetRequestedHandler implements IEventHandler<PasswordResetRequestedEvent> {
  private readonly logger = new Logger(OnPasswordResetRequestedHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    this.logger.log(`Sending password reset notification to user ${event.userId}`);

    const appUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?token=${event.resetToken}`;

    await this.commandBus.execute(
      new SendNotificationCommand(
        [event.userId],
        'password-reset',
        ['EMAIL'],
        {
          firstName: event.firstName,
          resetLink,
          expiresIn: event.expiresIn,
        },
        'fr',
      ),
    );
  }
}
