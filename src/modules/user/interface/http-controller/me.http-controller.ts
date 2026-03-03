import { JwtAuthGuard } from '@modules/auth/interface/guards/jwt-auth.guard';
import { UpdateMeCommand } from '@modules/auth/core/application/commands/update-me/update-me.command';
import { DeleteUserCommand } from '@modules/user/core/application/commands/delete-user/delete-user.command';
import { UpdateMeDto } from '@modules/user/core/application/dtos/update-me.dto';
import { UserProfileDto } from '@modules/user/core/application/dtos/user-profile.dto';
import { GetUserQuery } from '@modules/user/core/application/queries/get-user/get-user.query';
import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@shared/decorators/current-user.decorator';

interface AuthUser {
  userId: string;
  email: string;
}

@Controller('users')
@ApiTags('Users')
export class MeHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer mon profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil récupéré avec succès', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getMyProfile(@CurrentUser() user: AuthUser): Promise<UserProfileDto> {
    return this.queryBus.execute(new GetUserQuery(user.userId));
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Mettre à jour mon profil',
    description:
      'Met à jour les champs fournis. `currentPassword` est requis si `newEmail` ou `newPassword` est présent.',
  })
  @ApiResponse({ status: 200, description: 'Profil mis à jour avec succès', type: UserProfileDto })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou mot de passe actuel incorrect',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto): Promise<UserProfileDto> {
    const command = new UpdateMeCommand(
      user.userId,
      dto.firstName,
      dto.lastName,
      dto.newEmail,
      dto.currentPassword,
      dto.newPassword,
      dto.phoneNumber,
    );
    return this.commandBus.execute(command);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer mon compte utilisateur' })
  @ApiResponse({ status: 204, description: 'Compte supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async deleteMyAccount(@CurrentUser() user: AuthUser): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(user.userId));
  }
}
