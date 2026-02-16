import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RevokeSessionsCommand } from './revoke-sessions.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
@CommandHandler(RevokeSessionsCommand)
export class RevokeSessionsService implements ICommandHandler<RevokeSessionsCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(command: RevokeSessionsCommand): Promise<void> {
    if (
      command.targetUserId !== command.requesterId &&
      !ADMIN_ROLES.includes(command.requesterRole)
    ) {
      throw new ForbiddenException(
        "Vous n'avez pas la permission de révoquer les sessions d'un autre utilisateur",
      );
    }

    await this.refreshTokenRepository.revokeAllByUserId(command.targetUserId);
  }
}
