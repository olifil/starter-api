import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({ description: "Nom de l'expéditeur", example: 'Jean Dupont' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  senderName!: string;

  @ApiProperty({
    description: "Adresse email de l'expéditeur (pour répondre)",
    example: 'jean@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  senderEmail!: string;

  @ApiProperty({ description: 'Sujet du message', example: 'Question sur votre service' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: 'Corps du message', example: 'Bonjour, je souhaiterais...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}
