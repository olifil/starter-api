import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from '@shared/validation/password.validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  currentPassword!: string;

  @ApiProperty({ description: 'Nouveau mot de passe', minLength: 8 })
  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}
