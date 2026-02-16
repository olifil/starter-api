import { validate } from 'class-validator';
import { LoginDto } from '@modules/auth/core/application/dtos/login.dto';

describe('LoginDto', () => {
  const createValidDto = (): LoginDto => {
    const dto = new LoginDto();
    dto.email = 'test@example.com';
    dto.password = 'Password123!';
    return dto;
  };

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid email format', async () => {
      // Arrange
      const dto = createValidDto();
      dto.email = 'invalid-email';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints?.isEmail).toBe('Email invalide');
    });

    it('should fail when email is empty', async () => {
      // Arrange
      const dto = createValidDto();
      dto.email = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
      expect(errors[0].constraints?.isNotEmpty).toBe('Email requis');
    });

    it('should accept various valid email formats', async () => {
      // Arrange
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@sub.example.com',
      ];

      // Act & Assert
      for (const email of validEmails) {
        const dto = createValidDto();
        dto.email = email;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('password validation', () => {
    it('should pass with valid password', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail when password is empty', async () => {
      // Arrange
      const dto = createValidDto();
      dto.password = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.isNotEmpty).toBe('Mot de passe requis');
    });

    it('should accept any non-empty string password', async () => {
      // Arrange
      const passwords = [
        'simple',
        '12345678',
        'Complex!Pass123',
        'very-long-password-with-many-characters',
      ];

      // Act & Assert
      for (const password of passwords) {
        const dto = createValidDto();
        dto.password = password;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('complete validation', () => {
    it('should fail with multiple validation errors', async () => {
      // Arrange
      const dto = new LoginDto();
      dto.email = 'invalid-email';
      dto.password = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(2); // Both fields should have errors
    });

    it('should pass with all valid fields', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });
});
