import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';

@Exclude()
export class NotificationPreferenceResponseDto {
  @Expose()
  @ApiProperty({ description: 'ID de la préférence' })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Canal de notification' })
  channel!: string;

  @Expose()
  @ApiProperty({ description: 'Activé' })
  enabled!: boolean;

  static fromDomain(pref: NotificationPreference): NotificationPreferenceResponseDto {
    const dto = new NotificationPreferenceResponseDto();
    dto.id = pref.id;
    dto.channel = pref.channel;
    dto.enabled = pref.enabled;
    return dto;
  }
}
