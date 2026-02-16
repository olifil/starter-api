import { validate } from 'class-validator';
import { ForgotPasswordDto } from '@modules/auth/core/application/dtos/forgot-password.dto';

describe('ForgotPasswordDto', () => {
  const createValidDto = (): ForgotPasswordDto => {
    const dto = new ForgotPasswordDto();
    dto.email = 'user@example.com';
    return dto;
  };

  describe('email validation', () => {
    it('should pass with a valid email', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with an invalid email format', async () => {
      const dto = createValidDto();
      dto.email = 'not-an-email';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail with an empty string', async () => {
      const dto = createValidDto();
      dto.email = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
