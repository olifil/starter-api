import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueryHandler, IQueryHandler, EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginQuery } from './login.query';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { LoginResponseDto } from '../../dtos/login-response.dto';
import { InvalidCredentialsException } from '../../exceptions/invalid-credentials.exception';
import { EmailNotVerifiedException } from '../../exceptions/email-not-verified.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';
import { computeExpiresAt } from '@shared/utils/parse-duration';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<LoginQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(query: LoginQuery): Promise<LoginResponseDto> {
    const email = new Email(query.email);

    // Trouver l'utilisateur
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.verifyPassword(query.password);
    if (!isPasswordValid) {
      await this.matomoService.trackLoginFailed();
      throw new InvalidCredentialsException();
    }

    // Vérifier que l'email a été confirmé
    if (!user.emailVerified) {
      throw new EmailNotVerifiedException();
    }

    // Générer les tokens JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email.value,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      },
    );

    // Persister le refresh token en DB
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    await this.refreshTokenRepository.save(
      refreshToken,
      user.id,
      computeExpiresAt(refreshExpiresIn),
    );

    // Tracker la connexion dans Matomo
    await this.matomoService.trackUserLogin(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('jwt.expiresIn') || '15m',
    };
  }
}
