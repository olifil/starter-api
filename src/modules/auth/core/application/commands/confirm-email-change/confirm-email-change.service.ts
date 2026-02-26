import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfirmEmailChangeCommand } from './confirm-email-change.command';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { InvalidResetTokenException } from '../../exceptions/invalid-reset-token.exception';

interface EmailChangeTokenPayload {
  sub: string;
  newEmail: string;
  type: string;
}

@Injectable()
@CommandHandler(ConfirmEmailChangeCommand)
export class ConfirmEmailChangeService implements ICommandHandler<ConfirmEmailChangeCommand> {
  private readonly logger = new Logger(ConfirmEmailChangeService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly eventBus: EventBus,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: ConfirmEmailChangeCommand): Promise<void> {
    const emailChangeSecret =
      this.configService.get<string>('jwt.resetSecret') ??
      this.configService.get<string>('jwt.secret')!;

    let payload: EmailChangeTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<EmailChangeTokenPayload>(command.token, {
        secret: emailChangeSecret,
      });
    } catch {
      throw new InvalidResetTokenException();
    }

    if (payload.type !== 'email-change') {
      throw new InvalidResetTokenException();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new InvalidResetTokenException();
    }

    const newEmail = new Email(payload.newEmail);
    const emailExists = await this.userRepository.existsByEmail(newEmail);
    if (emailExists) {
      throw new EmailAlreadyExistsException(payload.newEmail);
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
