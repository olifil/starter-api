import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePreferencesCommand } from './update-preferences.command';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';
import {
  INotificationPreferenceRepository,
  NOTIFICATION_PREFERENCE_REPOSITORY,
} from '../../../domain/repositories/notification-preference.repository.interface';
import { NotificationPreferenceResponseDto } from '../../dtos/notification-preference-response.dto';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(UpdatePreferencesCommand)
export class UpdatePreferencesService implements ICommandHandler<UpdatePreferencesCommand> {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepository: INotificationPreferenceRepository,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<NotificationPreferenceResponseDto[]> {
    const results: NotificationPreferenceResponseDto[] = [];

    for (const pref of command.preferences) {
      const preference = new NotificationPreference({
        userId: command.userId,
        channel: pref.channel,
        enabled: pref.enabled,
      });

      const saved = await this.preferenceRepository.upsert(preference);
      results.push(NotificationPreferenceResponseDto.fromDomain(saved));
    }

    await this.matomoService.trackNotificationPreferencesUpdated(command.userId);

    return results;
  }
}
