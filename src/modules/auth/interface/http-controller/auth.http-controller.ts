import { Controller, Post, Body, HttpCode, HttpStatus, SetMetadata } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Public, IS_PUBLIC_KEY } from '@shared/authorization';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { RegisterDto } from '../../core/application/dtos/register.dto';
import { LoginDto } from '../../core/application/dtos/login.dto';
import { LoginResponseDto } from '../../core/application/dtos/login-response.dto';
import { RefreshTokenDto } from '../../core/application/dtos/refresh-token.dto';
import { ForgotPasswordDto } from '../../core/application/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../../core/application/dtos/reset-password.dto';
import { VerifyEmailDto } from '../../core/application/dtos/verify-email.dto';
import { RegisterCommand } from '../../core/application/commands/register/register.command';
import { RefreshTokenCommand } from '../../core/application/commands/refresh-token/refresh-token.command';
import { ForgotPasswordCommand } from '../../core/application/commands/forgot-password/forgot-password.command';
import { ResetPasswordCommand } from '../../core/application/commands/reset-password/reset-password.command';
import { VerifyEmailCommand } from '../../core/application/commands/verify-email/verify-email.command';
import { LogoutCommand } from '../../core/application/commands/logout/logout.command';
import { RevokeSessionsCommand } from '../../core/application/commands/revoke-sessions/revoke-sessions.command';
import { RevokeSessionsDto } from '../../core/application/dtos/revoke-sessions.dto';
import { LoginQuery } from '../../core/application/queries/login/login.query';

@Controller('auth')
@ApiTags('Authentication')
@Public()
export class AuthHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  @Throttle({ strict: {} })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Créer un nouveau compte utilisateur' })
  @ApiResponse({ status: 204, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @ApiResponse({ status: 422, description: 'CGU non acceptées' })
  async register(@Body() dto: RegisterDto): Promise<void> {
    const command = new RegisterCommand(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.termsAccepted,
    );
    await this.commandBus.execute(command);
  }

  @Post('login')
  @Throttle({ strict: {} })
  @ApiOperation({ summary: 'Se connecter avec email et mot de passe' })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const query = new LoginQuery(dto.email, dto.password);
    return this.queryBus.execute(query);
  }

  @Post('refresh')
  @SkipThrottle({ strict: true })
  @ApiOperation({
    summary: 'Échanger un refresh token contre un nouveau couple access/refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renouvelés avec succès',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponseDto> {
    return this.commandBus.execute(new RefreshTokenCommand(dto.refreshToken));
  }

  @Post('forgot-password')
  @Throttle({ strict: {} })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Demander une réinitialisation de mot de passe' })
  @ApiResponse({ status: 204, description: 'Email envoyé si le compte existe' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.commandBus.execute(new ForgotPasswordCommand(dto.email));
  }

  @Post('reset-password')
  @SkipThrottle({ strict: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec un token' })
  @ApiResponse({ status: 204, description: 'Mot de passe réinitialisé' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.commandBus.execute(new ResetPasswordCommand(dto.token, dto.newPassword));
  }

  @Post('verify-email')
  @SkipThrottle({ strict: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Vérifier l'adresse email avec le token reçu par email" })
  @ApiResponse({ status: 204, description: 'Email vérifié avec succès' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.commandBus.execute(new VerifyEmailCommand(dto.token));
  }

  @Post('logout')
  @SetMetadata(IS_PUBLIC_KEY, false)
  @SkipThrottle({ strict: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Se déconnecter et révoquer les refresh tokens' })
  @ApiResponse({ status: 204, description: 'Déconnexion réussie' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async logout(@CurrentUser() user: { userId: string }): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(user.userId));
  }

  @Post('revoke')
  @SetMetadata(IS_PUBLIC_KEY, false)
  @SkipThrottle({ strict: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: "Révoquer toutes les sessions d'un utilisateur (soi-même ou un autre pour ADMIN)",
  })
  @ApiResponse({ status: 204, description: 'Sessions révoquées avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Permission insuffisante pour révoquer un autre utilisateur',
  })
  async revokeSessions(
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: RevokeSessionsDto,
  ): Promise<void> {
    const targetUserId = dto.userId ?? user.userId;
    await this.commandBus.execute(new RevokeSessionsCommand(user.userId, user.role, targetUserId));
  }
}
