import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';

export class SendNotificationDto {
  @ApiProperty({
    description: 'IDs des utilisateurs destinataires. Tableau vide [] = tous les utilisateurs.',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Chaque userId doit être un UUID v4 valide' })
  userIds!: string[];

  @ApiProperty({
    description: 'Type de notification',
    example: 'welcome',
  })
  @IsString()
  @IsNotEmpty({ message: 'Type de notification requis' })
  type!: string;

  @ApiProperty({
    description: 'Canaux de notification',
    enum: NotificationChannel,
    isArray: true,
    example: ['EMAIL', 'WEBSOCKET'],
  })
  @IsArray()
  @IsEnum(NotificationChannel, {
    each: true,
    message: 'Canal de notification invalide',
  })
  channels!: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Variables pour le template',
    example: { firstName: 'Jean', appName: 'Starter API' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Langue (locale)',
    example: 'fr',
  })
  @IsOptional()
  @IsString()
  locale?: string;
}
