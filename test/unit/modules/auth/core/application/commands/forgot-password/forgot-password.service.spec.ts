import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordService } from '@modules/auth/core/application/commands/forgot-password/forgot-password.service';
import { ForgotPasswordCommand } from '@modules/auth/core/application/commands/forgot-password/forgot-password.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { PasswordResetRequestedEvent } from '@modules/auth/core/domain/events/password-reset-requested.event';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';

describe('ForgotPasswordService', () => {
  let service: ForgotPasswordService;
  let userRepository: jest.Mocked<IUserRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = new User({
    id: 'user-1',
    email: new Email('john@example.com'),
    password: HashedPassword.fromHash('hashed'),
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findByEmail: jest.fn(),
    };

    const mockEventBus: Partial<jest.Mocked<EventBus>> = {
      publish: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('reset-token-abc'),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'jwt.resetSecret': 'reset-secret',
          'jwt.resetExpiresIn': '15m',
        };
        return key in config ? config[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForgotPasswordService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: EventBus, useValue: mockEventBus },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ForgotPasswordService>(ForgotPasswordService);
    userRepository = module.get(USER_REPOSITORY) as jest.Mocked<IUserRepository>;
    eventBus = module.get(EventBus);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should publish PasswordResetRequestedEvent when user exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await service.execute(new ForgotPasswordCommand('john@example.com'));

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'john@example.com', type: 'password-reset' },
        expect.objectContaining({ secret: 'reset-secret' }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(expect.any(PasswordResetRequestedEvent));

      const event = (eventBus.publish as jest.Mock).mock.calls[0][0] as PasswordResetRequestedEvent;
      expect(event.userId).toBe('user-1');
      expect(event.firstName).toBe('John');
      expect(event.resetToken).toBe('reset-token-abc');
    });

    it('should not publish event when user does not exist', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await service.execute(new ForgotPasswordCommand('unknown@example.com'));

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should resolve silently when user does not exist (no info leakage)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.execute(new ForgotPasswordCommand('unknown@example.com')),
      ).resolves.toBeUndefined();
    });
  });
});
