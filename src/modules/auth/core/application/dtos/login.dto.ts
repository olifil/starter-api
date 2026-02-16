import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Adresse email' })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email requis' })
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'Mot de passe' })
  @IsString()
  @IsNotEmpty({ message: 'Mot de passe requis' })
  password!: string;
}
