import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RevokeSessionsService } from '@modules/auth/core/application/commands/revoke-sessions/revoke-sessions.service';
import { RevokeSessionsCommand } from '@modules/auth/core/application/commands/revoke-sessions/revoke-sessions.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@modules/auth/core/domain/repositories/refresh-token.repository.interface';

describe('RevokeSessionsService', () => {
  let service: RevokeSessionsService;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(async () => {
    const mockRefreshTokenRepository: Partial<jest.Mocked<IRefreshTokenRepository>> = {
      revokeAllByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevokeSessionsService,
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepository },
      ],
    }).compile();

    service = module.get<RevokeSessionsService>(RevokeSessionsService);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should revoke own sessions for any authenticated user', async () => {
      const userId = 'user-123';

      await service.execute(new RevokeSessionsCommand(userId, 'AUTHENTICATED_USER', userId));

      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
    });

    it('should allow ADMIN to revoke another user sessions', async () => {
      await service.execute(new RevokeSessionsCommand('admin-1', 'ADMIN', 'target-user'));

      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('target-user');
    });

    it('should allow SUPER_ADMIN to revoke another user sessions', async () => {
      await service.execute(new RevokeSessionsCommand('super-1', 'SUPER_ADMIN', 'target-user'));

      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('target-user');
    });

    it('should throw ForbiddenException when non-admin targets another user', async () => {
      await expect(
        service.execute(new RevokeSessionsCommand('user-1', 'AUTHENTICATED_USER', 'other-user')),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not call repository when authorization fails', async () => {
      await expect(
        service.execute(new RevokeSessionsCommand('user-1', 'AUTHENTICATED_USER', 'other-user')),
      ).rejects.toThrow();

      expect(refreshTokenRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });
  });
});
