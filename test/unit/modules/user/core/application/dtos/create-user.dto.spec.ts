import { validate } from 'class-validator';
import { CreateUserDto } from '@modules/user/core/application/dtos/create-user.dto';

describe('CreateUserDto', () => {
  const createValidDto = (): CreateUserDto => {
    const dto = new CreateUserDto();
    dto.email = 'test@example.com';
    dto.password = 'Password123!';
    dto.firstName = 'John';
    dto.lastName = 'Doe';
    return dto;
  };

  describe('email validation', () => {
    it('should pass with valid email', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
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

    it('should fail with empty email', async () => {
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
        'user123@test-domain.com',
      ];

      // Act & Assert
      for (const email of validEmails) {
        const dto = createValidDto();
        dto.email = email;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
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
      expect(errors.length).toBe(0);
    });

    it('should fail with password shorter than 8 characters', async () => {
      const dto = createValidDto();
      dto.password = 'Pass1!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail without uppercase letter', async () => {
      const dto = createValidDto();
      dto.password = 'password123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail without lowercase letter', async () => {
      const dto = createValidDto();
      dto.password = 'PASSWORD123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail without digit', async () => {
      const dto = createValidDto();
      dto.password = 'Password!@#';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail without special character', async () => {
      const dto = createValidDto();
      dto.password = 'Password123';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.isStrongPassword).toBeDefined();
    });

    it('should accept various valid passwords', async () => {
      // Arrange
      const validPasswords = ['Password123!', 'MyP@ssw0rd', 'Str0ng$Pass', 'C0mpl3x&Pass'];

      // Act & Assert
      for (const password of validPasswords) {
        const dto = createValidDto();
        dto.password = password;
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });

  describe('firstName validation', () => {
    it('should pass with valid firstName', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail with empty firstName', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const firstNameError = errors.find((e) => e.property === 'firstName');
      expect(firstNameError?.constraints?.isNotEmpty).toBe('Prénom requis');
    });

    it('should fail with firstName longer than 50 characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = 'a'.repeat(51);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const firstNameError = errors.find((e) => e.property === 'firstName');
      expect(firstNameError?.constraints?.maxLength).toBe(
        'Le prénom ne peut pas dépasser 50 caractères',
      );
    });

    it('should accept firstName with exactly 50 characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = 'a'.repeat(50);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should accept firstName with special characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = 'Jean-François';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  describe('lastName validation', () => {
    it('should pass with valid lastName', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail with empty lastName', async () => {
      // Arrange
      const dto = createValidDto();
      dto.lastName = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const lastNameError = errors.find((e) => e.property === 'lastName');
      expect(lastNameError?.constraints?.isNotEmpty).toBe('Nom requis');
    });

    it('should fail with lastName longer than 50 characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.lastName = 'a'.repeat(51);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const lastNameError = errors.find((e) => e.property === 'lastName');
      expect(lastNameError?.constraints?.maxLength).toBe(
        'Le nom ne peut pas dépasser 50 caractères',
      );
    });

    it('should accept lastName with exactly 50 characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.lastName = 'a'.repeat(50);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  describe('multiple validation errors', () => {
    it('should return multiple errors for invalid dto', async () => {
      // Arrange
      const dto = new CreateUserDto();
      dto.email = 'invalid';
      dto.password = 'weak';
      dto.firstName = '';
      dto.lastName = '';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(3);
      const properties = errors.map((e) => e.property);
      expect(properties).toContain('email');
      expect(properties).toContain('password');
      expect(properties).toContain('firstName');
      expect(properties).toContain('lastName');
    });
  });

  describe('complete valid dto', () => {
    it('should pass validation with all valid fields', async () => {
      // Arrange
      const dto = createValidDto();

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });
});
