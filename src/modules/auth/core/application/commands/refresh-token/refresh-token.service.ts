import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenCommand } from './refresh-token.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { LoginResponseDto } from '../../dtos/login-response.dto';
import { InvalidRefreshTokenException } from '../../exceptions/invalid-refresh-token.exception';
import { computeExpiresAt } from '@shared/utils/parse-duration';
import { randomUUID } from 'crypto';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
@CommandHandler(RefreshTokenCommand)
export class RefreshTokenService implements ICommandHandler<RefreshTokenCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<LoginResponseDto> {
    // 1. Verify JWT signature and expiration
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(command.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new InvalidRefreshTokenException();
    }

    // 2. Check token exists in DB and is not revoked
    const storedToken = await this.refreshTokenRepository.findByToken(command.refreshToken);
    if (!storedToken || storedToken.revokedAt !== null) {
      throw new InvalidRefreshTokenException();
    }

    // 3. Verify user still exists
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new InvalidRefreshTokenException();
    }

    // 4. Revoke old refresh token (rotation)
    await this.refreshTokenRepository.revoke(storedToken.id);

    // 5. Generate new tokens
    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email.value,
    };

    const accessToken = this.jwtService.sign(newPayload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(
      { ...newPayload, jti: randomUUID() },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      },
    );

    // 6. Persist new refresh token
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    await this.refreshTokenRepository.save(
      refreshToken,
      user.id,
      computeExpiresAt(refreshExpiresIn),
    );

    await this.matomoService.trackTokenRefresh(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn') ?? '15m',
    };
  }
}
