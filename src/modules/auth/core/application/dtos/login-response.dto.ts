import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: "Token d'accès JWT" })
  accessToken!: string;

  @ApiProperty({ description: 'Token de rafraîchissement' })
  refreshToken!: string;

  @ApiProperty({ example: '15m', description: 'Durée de validité du token' })
  expiresIn!: string;
}
