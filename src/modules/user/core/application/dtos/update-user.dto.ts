import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    required: false,
    example: 'Jean',
    description: 'Nouveau prénom',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Prénom ne peut pas être vide' })
  @MaxLength(50, { message: 'Le prénom ne peut pas dépasser 50 caractères' })
  firstName?: string;

  @ApiProperty({
    required: false,
    example: 'Dupont',
    description: 'Nouveau nom',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nom ne peut pas être vide' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  lastName?: string;

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
