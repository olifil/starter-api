import { JwtAuthGuard } from '@modules/auth/interface/guards/jwt-auth.guard';
import { ChangeEmailCommand } from '@modules/auth/core/application/commands/change-email/change-email.command';
import { ChangePasswordCommand } from '@modules/auth/core/application/commands/change-password/change-password.command';
import { DeleteUserCommand } from '@modules/user/core/application/commands/delete-user/delete-user.command';
import { UpdateUserCommand } from '@modules/user/core/application/commands/update-user/update-user.command';
import { ChangeEmailDto } from '@modules/user/core/application/dtos/change-email.dto';
import { ChangePasswordDto } from '@modules/user/core/application/dtos/change-password.dto';
import { UpdateUserDto } from '@modules/user/core/application/dtos/update-user.dto';
import { UserProfileDto } from '@modules/user/core/application/dtos/user-profile.dto';
import { GetUserQuery } from '@modules/user/core/application/queries/get-user/get-user.query';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
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
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getMyProfile(@CurrentUser() user: AuthUser): Promise<UserProfileDto> {
    const query = new GetUserQuery(user.userId);
    return this.queryBus.execute(query);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mettre à jour mon profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    const command = new UpdateUserCommand(user.userId, dto.firstName, dto.lastName);
    return this.commandBus.execute(command);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Modifier mon mot de passe' })
  @ApiResponse({ status: 204, description: 'Mot de passe modifié avec succès' })
  @ApiResponse({
    status: 400,
    description: 'Mot de passe actuel incorrect ou nouveau mot de passe invalide',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    const command = new ChangePasswordCommand(user.userId, dto.currentPassword, dto.newPassword);
    return this.commandBus.execute(command);
  }

  @Patch('me/email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Modifier mon adresse email' })
  @ApiResponse({
    status: 200,
    description: 'Email modifié avec succès',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 400, description: 'Mot de passe incorrect ou email invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async changeEmail(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeEmailDto,
  ): Promise<UserProfileDto> {
    const command = new ChangeEmailCommand(user.userId, dto.currentPassword, dto.newEmail);
    return this.commandBus.execute(command);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer mon compte utilisateur' })
  @ApiResponse({ status: 204, description: 'Compte supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async deleteMyAccount(@CurrentUser() user: AuthUser): Promise<void> {
    const command = new DeleteUserCommand(user.userId);
    return this.commandBus.execute(command);
  }
}
