import { Test, TestingModule } from '@nestjs/testing';
import { LogoutService } from '@modules/auth/core/application/commands/logout/logout.service';
import { LogoutCommand } from '@modules/auth/core/application/commands/logout/logout.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@modules/auth/core/domain/repositories/refresh-token.repository.interface';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('LogoutService', () => {
  let service: LogoutService;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(async () => {
    const mockRefreshTokenRepository: Partial<jest.Mocked<IRefreshTokenRepository>> = {
      revokeAllByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutService,
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepository },
        { provide: MatomoService, useValue: { trackUserLogout: jest.fn() } },
      ],
    }).compile();

    service = module.get<LogoutService>(LogoutService);
    refreshTokenRepository = module.get(REFRESH_TOKEN_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should revoke all refresh tokens for the user', async () => {
      const userId = 'user-123';

      await service.execute(new LogoutCommand(userId));

      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledTimes(1);
    });

    it('should resolve successfully even if user has no tokens', async () => {
      refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      await expect(service.execute(new LogoutCommand('user-no-tokens'))).resolves.toBeUndefined();
    });
  });
});
