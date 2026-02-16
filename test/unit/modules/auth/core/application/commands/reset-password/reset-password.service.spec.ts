import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordService } from '@modules/auth/core/application/commands/reset-password/reset-password.service';
import { ResetPasswordCommand } from '@modules/auth/core/application/commands/reset-password/reset-password.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { InvalidResetTokenException } from '@modules/auth/core/application/exceptions/invalid-reset-token.exception';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';

describe('ResetPasswordService', () => {
  let service: ResetPasswordService;
  let userRepository: jest.Mocked<IUserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = new User({
    id: 'user-1',
    email: new Email('john@example.com'),
    password: HashedPassword.fromHash('old-hash'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validPayload = { sub: 'user-1', email: 'john@example.com', type: 'password-reset' };

  beforeEach(async () => {
    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'jwt.resetSecret': 'reset-secret',
        };
        return key in config ? config[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ResetPasswordService>(ResetPasswordService);
    userRepository = module.get(USER_REPOSITORY) as jest.Mocked<IUserRepository>;
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should reset password when token is valid', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.execute(new ResetPasswordCommand('valid-token', 'NewPassword1!'));

      expect(userRepository.findById).toHaveBeenCalledWith('user-1');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser);
    });

    it('should throw InvalidResetTokenException when JWT is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.execute(new ResetPasswordCommand('bad-token', 'NewPassword1!')),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('should throw InvalidResetTokenException when token type is not password-reset', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'john@example.com',
        type: 'access',
      });

      await expect(
        service.execute(new ResetPasswordCommand('wrong-type-token', 'NewPassword1!')),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('should throw InvalidResetTokenException when user not found', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.execute(new ResetPasswordCommand('valid-token', 'NewPassword1!')),
      ).rejects.toThrow(InvalidResetTokenException);
    });

    it('should call changePassword on the user entity', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      const changePasswordSpy = jest.spyOn(mockUser, 'changePassword');

      await service.execute(new ResetPasswordCommand('valid-token', 'NewPassword1!'));

      expect(changePasswordSpy).toHaveBeenCalledWith(expect.any(HashedPassword));
    });
  });
});
