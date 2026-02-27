import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetNotificationsQuery } from './get-notifications.query';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../../domain/repositories/notification.repository.interface';
import { NotificationResponseDto } from '../../dtos/notification-response.dto';
import { PaginatedResponseDto } from '@modules/user/core/application/dtos/pagination.dto';

@Injectable()
@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<GetNotificationsQuery> {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    query: GetNotificationsQuery,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const { notifications, total } = await this.notificationRepository.findByUserId(
      query.userId,
      query.page,
      query.pageSize,
      { type: query.type, channel: query.channel, status: query.status },
    );

    const data = notifications.map((n) => NotificationResponseDto.fromDomain(n));

    return PaginatedResponseDto.create(data, total, query.page, query.pageSize);
  }
}
