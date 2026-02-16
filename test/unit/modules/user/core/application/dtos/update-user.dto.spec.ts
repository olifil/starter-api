import { validate } from 'class-validator';
import { UpdateUserDto } from '@modules/user/core/application/dtos/update-user.dto';

describe('UpdateUserDto', () => {
  const createValidDto = (): UpdateUserDto => {
    const dto = new UpdateUserDto();
    dto.firstName = 'John';
    dto.lastName = 'Doe';
    return dto;
  };

  describe('valid cases', () => {
    it('should pass with both firstName and lastName', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only firstName', async () => {
      const dto = new UpdateUserDto();
      dto.firstName = 'John';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only lastName', async () => {
      const dto = new UpdateUserDto();
      dto.lastName = 'Doe';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with no fields (all optional)', async () => {
      const dto = new UpdateUserDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('firstName validation', () => {
    it('should fail with an empty firstName string', async () => {
      const dto = createValidDto();
      dto.firstName = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('firstName');
    });

    it('should fail with firstName exceeding 50 characters', async () => {
      const dto = createValidDto();
      dto.firstName = 'a'.repeat(51);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('firstName');
    });
  });

  describe('lastName validation', () => {
    it('should fail with an empty lastName string', async () => {
      const dto = createValidDto();
      dto.lastName = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lastName');
    });

    it('should fail with lastName exceeding 50 characters', async () => {
      const dto = createValidDto();
      dto.lastName = 'b'.repeat(51);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('lastName');
    });
  });
});
