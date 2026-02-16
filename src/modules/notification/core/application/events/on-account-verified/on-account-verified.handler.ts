import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { AccountVerifiedEvent } from '@modules/auth/core/domain/events/account-verified.event';
import { SendNotificationCommand } from '../../commands/send-notification/send-notification.command';

@Injectable()
@EventsHandler(AccountVerifiedEvent)
export class OnAccountVerifiedHandler implements IEventHandler<AccountVerifiedEvent> {
  private readonly logger = new Logger(OnAccountVerifiedHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: AccountVerifiedEvent): Promise<void> {
    this.logger.log(`Sending account-verified notification to user ${event.userId}`);

    const appName = this.configService.get<string>('app.name', 'Starter API');

    await this.commandBus.execute(
      new SendNotificationCommand(
        [event.userId],
        'account-verified',
        ['EMAIL'],
        {
          firstName: event.firstName,
          appName,
        },
        'fr',
      ),
    );
  }
}
