import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '@shared/validation/password.validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'Adresse email' })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email requis' })
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: 8,
    description:
      'Mot de passe (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial)',
  })
  @IsString()
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Jean', maxLength: 50, description: 'Prénom' })
  @IsString()
  @IsNotEmpty({ message: 'Prénom requis' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  firstName!: string;

  @ApiProperty({
    example: 'Dupont',
    maxLength: 50,
    description: 'Nom de famille',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nom requis' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  lastName!: string;
}
