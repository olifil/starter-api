import { validate } from 'class-validator';
import { RegisterDto } from '@modules/auth/core/application/dtos/register.dto';

describe('RegisterDto', () => {
  const createValidDto = (): RegisterDto => {
    const dto = new RegisterDto();
    dto.email = 'test@example.com';
    dto.password = 'Password123!';
    dto.firstName = 'John';
    dto.lastName = 'Doe';
    dto.termsAccepted = true;
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
  });

  describe('password validation', () => {
    it('should pass with valid password', async () => {
      // Arrange
      const dto = createValidDto();
      dto.password = 'ValidPass123!';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail with password shorter than 8 characters', async () => {
      const dto = createValidDto();
      dto.password = 'Pass1!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail with password without uppercase', async () => {
      const dto = createValidDto();
      dto.password = 'password123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
      expect(errors[0].constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail with password without lowercase', async () => {
      const dto = createValidDto();
      dto.password = 'PASSWORD123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail with password without special character', async () => {
      const dto = createValidDto();
      dto.password = 'Password123';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should accept various special characters', async () => {
      // Arrange
      const specialChars = ['!', '@', '$', '%', '*', '?', '&'];

      // Act & Assert
      for (const char of specialChars) {
        const dto = createValidDto();
        dto.password = `Password123${char}`;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('firstName validation', () => {
    it('should pass with valid firstName', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = 'John';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail when firstName is empty', async () => {
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

    it('should fail when firstName exceeds 50 characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = 'A'.repeat(51);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const firstNameError = errors.find((e) => e.property === 'firstName');
      expect(firstNameError?.constraints?.maxLength).toBe(
        'Le prénom ne peut pas dépasser 50 caractères',
      );
    });

    it('should pass with firstName at maximum length', async () => {
      // Arrange
      const dto = createValidDto();
      dto.firstName = 'A'.repeat(50);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('lastName validation', () => {
    it('should pass with valid lastName', async () => {
      // Arrange
      const dto = createValidDto();
      dto.lastName = 'Doe';

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail when lastName is empty', async () => {
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

    it('should fail when lastName exceeds 50 characters', async () => {
      // Arrange
      const dto = createValidDto();
      dto.lastName = 'A'.repeat(51);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const lastNameError = errors.find((e) => e.property === 'lastName');
      expect(lastNameError?.constraints?.maxLength).toBe(
        'Le nom ne peut pas dépasser 50 caractères',
      );
    });

    it('should pass with lastName at maximum length', async () => {
      // Arrange
      const dto = createValidDto();
      dto.lastName = 'A'.repeat(50);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('termsAccepted validation', () => {
    it('should pass with termsAccepted = true', async () => {
      // Arrange
      const dto = createValidDto();
      dto.termsAccepted = true;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail when termsAccepted is false', async () => {
      // Arrange
      const dto = createValidDto();
      dto.termsAccepted = false;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const termsError = errors.find((e) => e.property === 'termsAccepted');
      expect(termsError?.constraints?.equals).toBeDefined();
    });

    it('should fail when termsAccepted is missing', async () => {
      // Arrange
      const dto = createValidDto();
      (dto as Partial<RegisterDto>).termsAccepted = undefined;

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const termsError = errors.find((e) => e.property === 'termsAccepted');
      expect(termsError).toBeDefined();
    });
  });

  describe('complete validation', () => {
    it('should fail with multiple validation errors', async () => {
      // Arrange
      const dto = new RegisterDto();
      dto.email = 'invalid';
      dto.password = 'weak';
      dto.firstName = '';
      dto.lastName = '';
      // termsAccepted not set → also fails

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(5); // email, password, firstName, lastName, termsAccepted
    });
  });
});
