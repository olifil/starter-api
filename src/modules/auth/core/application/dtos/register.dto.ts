import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '@shared/validation/password.validator';

export class RegisterDto {
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

  @ApiProperty({
    example: true,
    description: "Acceptation des conditions générales d'utilisation (obligatoire)",
  })
  @IsBoolean({ message: "L'acceptation des CGU doit être un booléen" })
  @Equals(true, { message: "L'acceptation des conditions générales d'utilisation est obligatoire" })
  termsAccepted!: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '+33612345678',
    description: 'Numéro de téléphone mobile au format E.164 (ex: +33612345678)',
  })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Numéro de téléphone invalide (format E.164 requis, ex: +33612345678)',
  })
  phoneNumber?: string | null;
}
