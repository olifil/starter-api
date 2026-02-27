import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkAllAsReadCommand } from './mark-all-as-read.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';

@Injectable()
@CommandHandler(MarkAllAsReadCommand)
export class MarkAllAsReadService implements ICommandHandler<MarkAllAsReadCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(command: MarkAllAsReadCommand): Promise<{ count: number }> {
    const count = await this.notificationRepository.markAllAsRead(command.userId, command.channel);
    return { count };
  }
}
