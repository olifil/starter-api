import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Le refresh token obtenu lors du login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
