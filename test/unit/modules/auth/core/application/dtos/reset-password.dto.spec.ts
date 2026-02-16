import { validate } from 'class-validator';
import { ResetPasswordDto } from '@modules/auth/core/application/dtos/reset-password.dto';

describe('ResetPasswordDto', () => {
  const createValidDto = (): ResetPasswordDto => {
    const dto = new ResetPasswordDto();
    dto.token = 'valid-reset-token';
    dto.newPassword = 'NewPass123!';
    return dto;
  };

  describe('token validation', () => {
    it('should pass with a valid token', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept an empty string token (only @IsString validation)', async () => {
      const dto = createValidDto();
      dto.token = '';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('newPassword validation', () => {
    it('should pass with a strong password', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with a password shorter than 8 characters', async () => {
      const dto = createValidDto();
      dto.newPassword = 'Pa1!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
      expect(errors[0].constraints?.isStrongPassword).toBeDefined();
    });

    it('should fail with a password without uppercase', async () => {
      const dto = createValidDto();
      dto.newPassword = 'password123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
    });

    it('should fail with a password without lowercase', async () => {
      const dto = createValidDto();
      dto.newPassword = 'PASSWORD123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
    });

    it('should fail with a password without digit', async () => {
      const dto = createValidDto();
      dto.newPassword = 'Password!@#';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
    });

    it('should fail with a password without special character', async () => {
      const dto = createValidDto();
      dto.newPassword = 'Password123';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
    });

    it('should fail with a password exceeding 128 characters', async () => {
      const dto = createValidDto();
      dto.newPassword = 'P@ssw0rd' + 'a'.repeat(121);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPassword');
    });
  });
});
