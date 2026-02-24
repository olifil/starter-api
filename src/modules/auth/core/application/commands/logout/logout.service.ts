import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from './logout.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(LogoutCommand)
export class LogoutService implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.refreshTokenRepository.revokeAllByUserId(command.userId);
    await this.matomoService.trackUserLogout(command.userId);
  }
}
