import { IsString, IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPushSubscriptionDto {
  @ApiProperty({
    description: "URL de l'endpoint fournie par le navigateur",
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsUrl()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({ description: 'Clé publique p256dh encodée en base64url' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Clé auth encodée en base64url' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}
