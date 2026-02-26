import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChangePasswordCommand } from './change-password.command';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { InvalidCurrentPasswordException } from '../../exceptions/invalid-current-password.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordService implements ICommandHandler<ChangePasswordCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    const isValid = await user.verifyPassword(command.currentPassword);
    if (!isValid) {
      throw new InvalidCurrentPasswordException();
    }

    const newPassword = await HashedPassword.fromPlainPassword(command.newPassword);
    user.changePassword(newPassword);
    await this.userRepository.update(user);

    await this.refreshTokenRepository.revokeAllByUserId(command.userId);
    await this.matomoService.trackPasswordResetCompleted(command.userId);
  }
}
