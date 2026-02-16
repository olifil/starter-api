import { Injectable, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordCommand } from './forgot-password.command';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { PasswordResetRequestedEvent } from '../../../domain/events/password-reset-requested.event';

@Injectable()
@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordService implements ICommandHandler<ForgotPasswordCommand> {
  private readonly logger = new Logger(ForgotPasswordService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const email = new Email(command.email);
    const user = await this.userRepository.findByEmail(email);

    // Ne pas révéler si l'email existe ou non
    if (!user) {
      this.logger.debug(`Password reset requested for unknown email: ${command.email}`);
      return;
    }

    const resetSecret =
      this.configService.get<string>('jwt.resetSecret') ??
      this.configService.get<string>('jwt.secret')!;
    const resetExpiresIn = this.configService.get<string>('jwt.resetExpiresIn', '15m');

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email.value, type: 'password-reset' },

      { secret: resetSecret, expiresIn: resetExpiresIn as any },
    );

    this.eventBus.publish(
      new PasswordResetRequestedEvent(
        user.id,
        user.email.value,
        user.firstName,
        resetToken,
        resetExpiresIn,
      ),
    );
  }
}
