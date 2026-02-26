import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ description: 'Nouvel email', example: 'nouveau@exemple.com' })
  @IsEmail({}, { message: "Format d'email invalide" })
  @IsNotEmpty({ message: 'Le nouvel email est requis' })
  newEmail!: string;

  @ApiProperty({ description: 'Mot de passe actuel (confirmation)' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  currentPassword!: string;
}
