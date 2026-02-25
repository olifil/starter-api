import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordCommand } from './reset-password.command';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { InvalidResetTokenException } from '../../exceptions/invalid-reset-token.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

interface ResetTokenPayload {
  sub: string;
  email: string;
  type: string;
}

@Injectable()
@CommandHandler(ResetPasswordCommand)
export class ResetPasswordService implements ICommandHandler<ResetPasswordCommand> {
  private readonly logger = new Logger(ResetPasswordService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const resetSecret =
      this.configService.get<string>('jwt.resetSecret') ??
      this.configService.get<string>('jwt.secret')!;

    let payload: ResetTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<ResetTokenPayload>(command.token, {
        secret: resetSecret,
      });
    } catch {
      throw new InvalidResetTokenException();
    }

    if (payload.type !== 'password-reset') {
      throw new InvalidResetTokenException();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new InvalidResetTokenException();
    }

    const newPassword = await HashedPassword.fromPlainPassword(command.newPassword);
    user.changePassword(newPassword);
    await this.userRepository.update(user);
    await this.matomoService.trackPasswordResetCompleted(user.id);

    this.logger.log(`Password reset for user ${user.id}`);
  }
}
