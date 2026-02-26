import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { ChangeEmailCommand } from './change-email.command';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { UserProfileDto } from '@modules/user/core/application/dtos/user-profile.dto';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { InvalidCurrentPasswordException } from '../../exceptions/invalid-current-password.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(ChangeEmailCommand)
export class ChangeEmailService implements ICommandHandler<ChangeEmailCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: ChangeEmailCommand): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    const isValid = await user.verifyPassword(command.currentPassword);
    if (!isValid) {
      throw new InvalidCurrentPasswordException();
    }

    const newEmail = new Email(command.newEmail);

    const emailExists = await this.userRepository.existsByEmail(newEmail);
    if (emailExists) {
      throw new EmailAlreadyExistsException(command.newEmail);
    }

    user.changeEmail(newEmail);
    const updatedUser = await this.userRepository.update(user);

    updatedUser.domainEvents.forEach((event) => {
      this.eventBus.publish(event as IEvent);
    });
    updatedUser.clearDomainEvents();

    await this.refreshTokenRepository.revokeAllByUserId(command.userId);
    await this.matomoService.trackUserProfileUpdated(command.userId);

    return UserProfileDto.fromDomain(updatedUser);
  }
}
