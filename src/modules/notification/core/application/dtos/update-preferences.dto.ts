import { IsArray, ValidateNested, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';

export class ChannelPreferenceDto {
  @ApiProperty({
    description: 'Canal de notification',
    enum: NotificationChannel,
    example: 'EMAIL',
  })
  @IsEnum(NotificationChannel, { message: 'Canal invalide' })
  channel!: NotificationChannel;

  @ApiProperty({
    description: 'Activé ou désactivé',
    example: true,
  })
  @IsBoolean({ message: 'enabled doit être un booléen' })
  enabled!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Préférences par canal',
    type: [ChannelPreferenceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelPreferenceDto)
  preferences!: ChannelPreferenceDto[];
}
