import { validate } from 'class-validator';
import { IsStrongPassword } from '@shared/validation/password.validator';

class TestDto {
  @IsStrongPassword()
  password!: string;
}

describe('IsStrongPassword', () => {
  const createDto = (password: string): TestDto => {
    const dto = new TestDto();
    dto.password = password;
    return dto;
  };

  describe('valid passwords', () => {
    it.each(['Password1!', 'MyP@ssw0rd', 'Str0ng$Pass', 'C0mpl3x&Pass', 'Ab1!abcd'])(
      'should accept "%s"',
      async (password) => {
        const errors = await validate(createDto(password));
        expect(errors).toHaveLength(0);
      },
    );
  });

  describe('too short', () => {
    it('should reject password shorter than 8 characters', async () => {
      const errors = await validate(createDto('Pa1!abc'));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isStrongPassword).toBeDefined();
    });
  });

  describe('too long', () => {
    it('should reject password exceeding 128 characters', async () => {
      const longPassword = 'P@ssw0rd' + 'a'.repeat(121);
      expect(longPassword.length).toBe(129);
      const errors = await validate(createDto(longPassword));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept password of exactly 128 characters', async () => {
      const maxPassword = 'P@ssw0rd' + 'a'.repeat(120);
      expect(maxPassword.length).toBe(128);
      const errors = await validate(createDto(maxPassword));
      expect(errors).toHaveLength(0);
    });
  });

  describe('missing complexity', () => {
    it('should reject without uppercase', async () => {
      const errors = await validate(createDto('password123!'));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject without lowercase', async () => {
      const errors = await validate(createDto('PASSWORD123!'));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject without digit', async () => {
      const errors = await validate(createDto('Password!@#'));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject without special character', async () => {
      const errors = await validate(createDto('Password123'));
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('disallowed characters', () => {
    it('should reject password with spaces', async () => {
      const errors = await validate(createDto('Pass word1!'));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject password with unsupported special chars', async () => {
      const errors = await validate(createDto('Password1#'));
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('error message', () => {
    it('should return the centralized error message', async () => {
      const errors = await validate(createDto('weak'));
      expect(errors[0].constraints?.isStrongPassword).toContain('entre 8 et 128 caractères');
    });
  });
});
