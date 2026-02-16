import { IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeletePushSubscriptionDto {
  @ApiProperty({
    description: "URL de l'endpoint à supprimer",
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsUrl()
  @IsNotEmpty()
  endpoint!: string;
}
