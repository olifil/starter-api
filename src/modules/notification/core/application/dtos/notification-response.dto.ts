import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Notification } from '../../domain/entities/notification.entity';

@Exclude()
export class NotificationResponseDto {
  @Expose()
  @ApiProperty({ description: 'ID de la notification' })
  id!: string;

  @Expose()
  @ApiProperty({ description: "ID de l'utilisateur" })
  userId!: string;

  @Expose()
  @ApiProperty({ description: 'Type de notification' })
  type!: string;

  @Expose()
  @ApiProperty({ description: 'Canal de notification' })
  channel!: string;

  @Expose()
  @ApiProperty({ description: 'Statut' })
  status!: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Sujet' })
  subject?: string;

  @Expose()
  @ApiProperty({ description: 'Corps du message' })
  body!: string;

  @Expose()
  @ApiPropertyOptional({ description: "Date d'envoi" })
  sentAt?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Date de lecture' })
  readAt?: string;

  @Expose()
  @ApiProperty({ description: 'Date de création' })
  createdAt!: string;

  static fromDomain(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.userId = notification.userId;
    dto.type = notification.type.value;
    dto.channel = notification.channel;
    dto.status = notification.status;
    dto.subject = notification.subject;
    dto.body = notification.body;
    dto.sentAt = notification.sentAt?.toISOString();
    dto.readAt = notification.readAt?.toISOString();
    dto.createdAt = notification.createdAt.toISOString();
    return dto;
  }
}
