import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { UpdateMeCommand } from './update-me.command';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
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
import { EmailChangeRequestedEvent } from '../../../domain/events/email-change-requested.event';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';
import { EmailTokenService } from '../../services/email-token.service';

@Injectable()
@CommandHandler(UpdateMeCommand)
export class UpdateMeService implements ICommandHandler<UpdateMeCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly eventBus: EventBus,
    private readonly emailTokenService: EmailTokenService,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: UpdateMeCommand): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    const needsPasswordVerification = !!(command.newEmail || command.newPassword);

    if (needsPasswordVerification) {
      const isValid = await user.verifyPassword(command.currentPassword!);
      if (!isValid) {
        throw new InvalidCurrentPasswordException();
      }
    }

    if (command.firstName !== undefined || command.lastName !== undefined) {
      user.updateProfile(command.firstName ?? user.firstName, command.lastName ?? user.lastName);
    }

    // Le changement d'email passe par un flux de vérification (token envoyé à la nouvelle adresse)
    if (command.newEmail) {
      const newEmail = new Email(command.newEmail);
      const emailExists = await this.userRepository.existsByEmail(newEmail);
      if (emailExists) {
        throw new EmailAlreadyExistsException(command.newEmail);
      }

      const { token: confirmationToken, expiresIn } =
        await this.emailTokenService.generateEmailChangeToken(user.id, command.newEmail);

      this.eventBus.publish(
        new EmailChangeRequestedEvent(
          user.id,
          user.firstName,
          command.newEmail,
          confirmationToken,
          expiresIn,
        ),
      );
    }

    if (command.newPassword) {
      const newPassword = await HashedPassword.fromPlainPassword(command.newPassword);
      user.changePassword(newPassword);
    }

    const updatedUser = await this.userRepository.update(user);

    updatedUser.domainEvents.forEach((event) => {
      this.eventBus.publish(event as IEvent);
    });
    updatedUser.clearDomainEvents();

    if (command.newPassword) {
      await this.refreshTokenRepository.revokeAllByUserId(command.userId);
    }

    await this.matomoService.trackUserProfileUpdated(command.userId);

    return UserProfileDto.fromDomain(updatedUser);
  }
}
