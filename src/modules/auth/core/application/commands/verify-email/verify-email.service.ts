import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { VerifyEmailCommand } from './verify-email.command';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { InvalidVerificationTokenException } from '../../exceptions/invalid-verification-token.exception';
import { InvalidResetTokenException } from '../../exceptions/invalid-reset-token.exception';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { AccountVerifiedEvent } from '../../../domain/events/account-verified.event';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';
import { EmailTokenService } from '../../services/email-token.service';

@Injectable()
@CommandHandler(VerifyEmailCommand)
export class VerifyEmailService implements ICommandHandler<VerifyEmailCommand> {
  private readonly logger = new Logger(VerifyEmailService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly emailTokenService: EmailTokenService,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const result = await this.emailTokenService.verifyEmailToken(command.token);

    if (result.type === 'email-verification') {
      const user = await this.userRepository.findById(result.sub);
      if (!user) {
        throw new InvalidVerificationTokenException();
      }

      user.verifyEmail();
      await this.userRepository.update(user);
      await this.matomoService.trackEmailVerified(user.id);

      this.eventBus.publish(new AccountVerifiedEvent(user.id, user.email.value, user.firstName));

      this.logger.log(`Email verified for user ${user.id}`);
    } else {
      const user = await this.userRepository.findById(result.sub);
      if (!user) {
        throw new InvalidResetTokenException();
      }

      const newEmail = new Email(result.newEmail);
      const emailExists = await this.userRepository.existsByEmail(newEmail);
      if (emailExists) {
        throw new EmailAlreadyExistsException(result.newEmail);
      }

      user.changeEmail(newEmail);
      const updatedUser = await this.userRepository.update(user);

      updatedUser.domainEvents.forEach((event) => {
        this.eventBus.publish(event as IEvent);
      });
      updatedUser.clearDomainEvents();

      await this.refreshTokenRepository.revokeAllByUserId(user.id);

      this.logger.log(`Email changed for user ${user.id}`);
    }
  }
}
