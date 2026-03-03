import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsStrongPassword } from '@shared/validation/password.validator';

export class UpdateMeDto {
  @ApiProperty({ required: false, example: 'Jean', description: 'Nouveau prénom' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le prénom ne peut pas être vide' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  firstName?: string;

  @ApiProperty({ required: false, example: 'Dupont', description: 'Nouveau nom' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  lastName?: string;

  @ApiProperty({ required: false, example: 'nouveau@exemple.com', description: 'Nouvel email' })
  @IsOptional()
  @IsEmail({}, { message: "Format d'email invalide" })
  newEmail?: string;

  @ApiProperty({ required: false, description: 'Nouveau mot de passe', minLength: 8 })
  @IsOptional()
  @IsString()
  @IsStrongPassword()
  newPassword?: string;

  @ApiProperty({
    required: false,
    description: 'Mot de passe actuel — requis si newEmail ou newPassword est fourni',
  })
  @ValidateIf((o: UpdateMeDto) => !!o.newEmail || !!o.newPassword)
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis pour modifier email ou mot de passe' })
  currentPassword?: string;

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
