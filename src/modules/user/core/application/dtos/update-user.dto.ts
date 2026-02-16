import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
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
}
