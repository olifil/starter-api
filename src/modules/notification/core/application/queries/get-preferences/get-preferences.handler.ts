import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetPreferencesQuery } from './get-preferences.query';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '../../../domain/repositories/notification-preference.repository.interface';
import { NotificationPreferenceResponseDto } from '../../dtos/notification-preference-response.dto';

@Injectable()
@QueryHandler(GetPreferencesQuery)
export class GetPreferencesHandler implements IQueryHandler<GetPreferencesQuery> {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: INotificationPreferenceRepository,
  ) {}

  async execute(query: GetPreferencesQuery): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.preferenceRepository.findByUserId(query.userId);
    return preferences.map((p) => NotificationPreferenceResponseDto.fromDomain(p));
  }
}
