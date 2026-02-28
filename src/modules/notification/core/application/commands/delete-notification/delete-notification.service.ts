import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteNotificationCommand } from './delete-notification.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';
import { NotificationNotFoundException } from '../../exceptions/notification-not-found.exception';

@Injectable()
@CommandHandler(DeleteNotificationCommand)
export class DeleteNotificationService implements ICommandHandler<DeleteNotificationCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(command: DeleteNotificationCommand): Promise<void> {
    const notification = await this.notificationRepository.findById(command.notificationId);

    if (!notification || notification.userId !== command.userId) {
      throw new NotificationNotFoundException(command.notificationId);
    }

    notification.markAsDeleted();
    await this.notificationRepository.update(notification);
  }
}
