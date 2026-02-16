import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailCommand } from './verify-email.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { InvalidVerificationTokenException } from '../../exceptions/invalid-verification-token.exception';
import { AccountVerifiedEvent } from '../../../domain/events/account-verified.event';

interface VerificationTokenPayload {
  sub: string;
  email: string;
  type: string;
}

@Injectable()
@CommandHandler(VerifyEmailCommand)
export class VerifyEmailService implements ICommandHandler<VerifyEmailCommand> {
  private readonly logger = new Logger(VerifyEmailService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    let payload: VerificationTokenPayload;

    try {
      const verificationSecret =
        this.configService.get<string>('jwt.verificationSecret') ??
        this.configService.get<string>('jwt.secret')!;

      payload = this.jwtService.verify<VerificationTokenPayload>(command.token, {
        secret: verificationSecret,
      });
    } catch {
      throw new InvalidVerificationTokenException();
    }

    if (payload.type !== 'email-verification') {
      throw new InvalidVerificationTokenException();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new InvalidVerificationTokenException();
    }

    user.verifyEmail();
    await this.userRepository.update(user);

    this.eventBus.publish(new AccountVerifiedEvent(user.id, user.email.value, user.firstName));

    this.logger.log(`Email verified for user ${user.id}`);
  }
}
