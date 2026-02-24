import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarkAsReadCommand } from './mark-as-read.command';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';
import { NotificationResponseDto } from '../../dtos/notification-response.dto';
import { NotificationNotFoundException } from '../../exceptions/notification-not-found.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(MarkAsReadCommand)
export class MarkAsReadService implements ICommandHandler<MarkAsReadCommand> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: MarkAsReadCommand): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findById(command.notificationId);

    if (!notification || notification.userId !== command.userId) {
      throw new NotificationNotFoundException(command.notificationId);
    }

    notification.markAsRead();
    const updated = await this.notificationRepository.update(notification);
    await this.matomoService.trackNotificationMarkedAsRead(command.userId);
    return NotificationResponseDto.fromDomain(updated);
  }
}
