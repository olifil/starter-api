import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { UserDeletedEvent } from '@modules/user/core/domain/events/user-deleted.event';
import { SendNotificationCommand } from '../../commands/send-notification/send-notification.command';

@Injectable()
@EventsHandler(UserDeletedEvent)
export class OnUserDeletedHandler implements IEventHandler<UserDeletedEvent> {
  private readonly logger = new Logger(OnUserDeletedHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserDeletedEvent): Promise<void> {
    this.logger.log(`Sending account deletion confirmation to user ${event.userId}`);

    await this.commandBus.execute(
      new SendNotificationCommand(
        [event.userId],
        'account-deleted',
        ['EMAIL'],
        { firstName: event.firstName },
        'fr',
      ),
    );
  }
}
