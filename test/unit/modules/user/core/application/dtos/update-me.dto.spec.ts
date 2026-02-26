import { validate } from 'class-validator';
import { UpdateMeDto } from '@modules/user/core/application/dtos/update-me.dto';

describe('UpdateMeDto', () => {
  describe('valid cases', () => {
    it('should pass with an empty body (all fields are optional)', async () => {
      const dto = new UpdateMeDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only firstName', async () => {
      const dto = new UpdateMeDto();
      dto.firstName = 'Jean';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only lastName', async () => {
      const dto = new UpdateMeDto();
      dto.lastName = 'Dupont';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with firstName and lastName', async () => {
      const dto = new UpdateMeDto();
      dto.firstName = 'Jean';
      dto.lastName = 'Dupont';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with newEmail and currentPassword', async () => {
      const dto = new UpdateMeDto();
      dto.newEmail = 'nouveau@exemple.com';
      dto.currentPassword = 'OldPassword1!';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with newPassword and currentPassword', async () => {
      const dto = new UpdateMeDto();
      dto.newPassword = 'NewPassword1!';
      dto.currentPassword = 'OldPassword1!';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all fields provided', async () => {
      const dto = new UpdateMeDto();
      dto.firstName = 'Jean';
      dto.lastName = 'Dupont';
      dto.newEmail = 'nouveau@exemple.com';
      dto.newPassword = 'NewPassword1!';
      dto.currentPassword = 'OldPassword1!';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('firstName validation', () => {
    it('should fail with an empty firstName string', async () => {
      const dto = new UpdateMeDto();
      dto.firstName = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('firstName');
    });

    it('should fail with firstName exceeding 50 characters', async () => {
      const dto = new UpdateMeDto();
      dto.firstName = 'a'.repeat(51);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('firstName');
    });
  });

  describe('lastName validation', () => {
    it('should fail with an empty lastName string', async () => {
      const dto = new UpdateMeDto();
      dto.lastName = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lastName');
    });

    it('should fail with lastName exceeding 50 characters', async () => {
      const dto = new UpdateMeDto();
      dto.lastName = 'b'.repeat(51);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lastName');
    });
  });

  describe('newEmail validation', () => {
    it('should fail with an invalid email format', async () => {
      const dto = new UpdateMeDto();
      dto.newEmail = 'not-an-email';
      dto.currentPassword = 'OldPassword1!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'newEmail')).toBe(true);
    });
  });

  describe('newPassword validation', () => {
    it('should fail with a weak newPassword', async () => {
      const dto = new UpdateMeDto();
      dto.newPassword = 'weak';
      dto.currentPassword = 'OldPassword1!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
    });
  });

  describe('currentPassword conditional validation', () => {
    it('should fail when newEmail is provided without currentPassword', async () => {
      const dto = new UpdateMeDto();
      dto.newEmail = 'nouveau@exemple.com';
      // currentPassword absent intentionnellement
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
    });

    it('should fail when newPassword is provided without currentPassword', async () => {
      const dto = new UpdateMeDto();
      dto.newPassword = 'NewPassword1!';
      // currentPassword absent intentionnellement
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
    });

    it('should fail when currentPassword is empty and newEmail is provided', async () => {
      const dto = new UpdateMeDto();
      dto.newEmail = 'nouveau@exemple.com';
      dto.currentPassword = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
    });

    it('should NOT require currentPassword when neither newEmail nor newPassword is provided', async () => {
      const dto = new UpdateMeDto();
      dto.firstName = 'Jean';
      // currentPassword absent — pas requis car pas de newEmail/newPassword
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
