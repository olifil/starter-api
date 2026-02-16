import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RevokeSessionsDto {
  @ApiPropertyOptional({
    description:
      "UUID de l'utilisateur cible. Si omis, révoque les sessions de l'utilisateur authentifié. Si fourni et différent de l'utilisateur courant, nécessite le rôle ADMIN ou SUPER_ADMIN.",
  })
  @IsOptional()
  @IsUUID('4', { message: "L'identifiant utilisateur doit être un UUID v4 valide" })
  userId?: string;
}
