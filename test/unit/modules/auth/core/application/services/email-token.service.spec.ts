import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailTokenService } from '@modules/auth/core/application/services/email-token.service';
import { InvalidVerificationTokenException } from '@modules/auth/core/application/exceptions/invalid-verification-token.exception';
import { InvalidResetTokenException } from '@modules/auth/core/application/exceptions/invalid-reset-token.exception';

describe('EmailTokenService', () => {
  let service: EmailTokenService;
  let jwtService: jest.Mocked<JwtService>;

  const mockConfig: Record<string, string> = {
    'jwt.verificationSecret': 'verification-secret',
    'jwt.verificationExpiresIn': '7d',
    'jwt.emailChangeSecret': 'email-change-secret',
    'jwt.emailChangeExpiresIn': '1h',
  };

  beforeEach(async () => {
    const mockJwtService: Partial<jest.Mocked<JwtService>> = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService: Partial<ConfigService> = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) =>
          key in mockConfig ? mockConfig[key] : defaultValue,
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailTokenService>(EmailTokenService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateVerificationToken', () => {
    it('should sign a JWT with email-verification payload and verificationSecret', async () => {
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.generateVerificationToken('user-1', 'john@example.com');

      expect(result).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'john@example.com', type: 'email-verification' },
        expect.objectContaining({ secret: 'verification-secret' }),
      );
    });

    it('should use verificationExpiresIn from config', async () => {
      jwtService.signAsync.mockResolvedValue('signed-token');

      await service.generateVerificationToken('user-1', 'john@example.com');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '7d' }),
      );
    });
  });

  describe('generateEmailChangeToken', () => {
    it('should sign a JWT with email-change payload and emailChangeSecret', async () => {
      jwtService.signAsync.mockResolvedValue('change-token');

      const result = await service.generateEmailChangeToken('user-1', 'new@example.com');

      expect(result.token).toBe('change-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', newEmail: 'new@example.com', type: 'email-change' },
        expect.objectContaining({ secret: 'email-change-secret' }),
      );
    });

    it('should return the expiresIn value from config', async () => {
      jwtService.signAsync.mockResolvedValue('change-token');

      const result = await service.generateEmailChangeToken('user-1', 'new@example.com');

      expect(result.expiresIn).toBe('1h');
    });
  });

  describe('verifyEmailToken', () => {
    it('should route to verifyVerificationToken when type is email-verification', async () => {
      jwtService.decode.mockReturnValue({ type: 'email-verification' });
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'john@example.com',
        type: 'email-verification',
      });

      const result = await service.verifyEmailToken('valid-token');

      expect(result).toEqual({
        type: 'email-verification',
        sub: 'user-1',
        email: 'john@example.com',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({ secret: 'verification-secret' }),
      );
    });

    it('should route to verifyEmailChangeToken when type is email-change', async () => {
      jwtService.decode.mockReturnValue({ type: 'email-change' });
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        newEmail: 'new@example.com',
        type: 'email-change',
      });

      const result = await service.verifyEmailToken('change-token');

      expect(result).toEqual({
        type: 'email-change',
        sub: 'user-1',
        newEmail: 'new@example.com',
      });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'change-token',
        expect.objectContaining({ secret: 'email-change-secret' }),
      );
    });

    it('should throw InvalidVerificationTokenException for unknown token type', async () => {
      jwtService.decode.mockReturnValue({ type: 'password-reset' });

      await expect(service.verifyEmailToken('wrong-type-token')).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });

    it('should throw InvalidVerificationTokenException when token cannot be decoded', async () => {
      jwtService.decode.mockReturnValue(null);

      await expect(service.verifyEmailToken('invalid-token')).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });
  });

  describe('verifyVerificationToken', () => {
    it('should return sub and email when token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'john@example.com',
        type: 'email-verification',
      });

      const result = await service.verifyVerificationToken('valid-token');

      expect(result).toEqual({ sub: 'user-1', email: 'john@example.com' });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({ secret: 'verification-secret' }),
      );
    });

    it('should throw InvalidVerificationTokenException when JWT is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyVerificationToken('expired-token')).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });

    it('should throw InvalidVerificationTokenException when payload type is wrong', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'john@example.com',
        type: 'password-reset',
      });

      await expect(service.verifyVerificationToken('wrong-type-token')).rejects.toThrow(
        InvalidVerificationTokenException,
      );
    });
  });

  describe('verifyEmailChangeToken', () => {
    it('should return sub and newEmail when token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        newEmail: 'new@example.com',
        type: 'email-change',
      });

      const result = await service.verifyEmailChangeToken('valid-token');

      expect(result).toEqual({ sub: 'user-1', newEmail: 'new@example.com' });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-token',
        expect.objectContaining({ secret: 'email-change-secret' }),
      );
    });

    it('should throw InvalidResetTokenException when JWT is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyEmailChangeToken('expired-token')).rejects.toThrow(
        InvalidResetTokenException,
      );
    });

    it('should throw InvalidResetTokenException when payload type is wrong', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        newEmail: 'new@example.com',
        type: 'email-verification',
      });

      await expect(service.verifyEmailChangeToken('wrong-type-token')).rejects.toThrow(
        InvalidResetTokenException,
      );
    });
  });
});
