import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventBus } from '@nestjs/cqrs';
import { VerifyEmailService } from '@modules/auth/core/application/commands/verify-email/verify-email.service';
import { VerifyEmailCommand } from '@modules/auth/core/application/commands/verify-email/verify-email.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { InvalidVerificationTokenException } from '@modules/auth/core/application/exceptions/invalid-verification-token.exception';
import { AccountVerifiedEvent } from '@modules/auth/core/domain/events/account-verified.event';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

describe('VerifyEmailService', () => {
  let service: VerifyEmailService;
  let userRepository: jest.Mocked<IUserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let eventBus: jest.Mocked<EventBus>;

  const mockUser = new User({
    id: 'user-1',
    email: new Email('john@example.com'),
    password: HashedPassword.fromHash('hashed'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validPayload = { sub: 'user-1', email: 'john@example.com', type: 'email-verification' };

  beforeEach(async () => {
    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = { verify: jest.fn() };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'jwt.verificationSecret': 'verification-secret',
        };
        return key in config ? config[key] : defaultValue;
      }),
    };

    const mockEventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventBus, useValue: mockEventBus },
        { provide: MatomoService, useValue: { trackEmailVerified: jest.fn() } },
      ],
    }).compile();

    service = module.get<VerifyEmailService>(VerifyEmailService);
    userRepository = module.get(USER_REPOSITORY);
    jwtService = module.get(JwtService);
    eventBus = module.get(EventBus);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should verify email when token is valid', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(userRepository.findById).toHaveBeenCalledWith('user-1');
      expect(userRepository.update).toHaveBeenCalledWith(mockUser);
    });

    it('should call verifyEmail() on the user entity', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      const verifyEmailSpy = jest.spyOn(mockUser, 'verifyEmail');

      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(verifyEmailSpy).toHaveBeenCalled();
    });

    it('should publish AccountVerifiedEvent after successful verification', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      await service.execute(new VerifyEmailCommand('valid-token'));

      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(AccountVerifiedEvent));
      const event = eventBus.publish.mock.calls[0][0] as AccountVerifiedEvent;
      expect(event.userId).toBe('user-1');
      expect(event.email).toBe('john@example.com');
      expect(event.firstName).toBe('John');
    });

    it('should throw InvalidVerificationTokenException when JWT is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.execute(new VerifyEmailCommand('bad-token'))).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });

    it('should throw InvalidVerificationTokenException when token type is not email-verification', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'john@example.com',
        type: 'access',
      });

      await expect(service.execute(new VerifyEmailCommand('wrong-type-token'))).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });

    it('should throw InvalidVerificationTokenException when user not found', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.execute(new VerifyEmailCommand('valid-token'))).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });
  });
});
