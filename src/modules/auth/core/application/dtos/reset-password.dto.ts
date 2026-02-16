import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsStrongPassword } from '@shared/validation/password.validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de réinitialisation reçu par email' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Nouveau mot de passe', minLength: 8 })
  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}
