import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmEmailChangeDto {
  @ApiProperty({ description: 'Token de confirmation reçu par email à la nouvelle adresse' })
  @IsString()
  token!: string;
}
