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

  describe('phoneNumber validation', () => {
    it('should pass when phoneNumber is absent', async () => {
      const dto = new UpdateUserDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with a valid E.164 number', async () => {
      const dto = new UpdateUserDto();
      dto.phoneNumber = '+33612345678';
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with a number missing the + prefix', async () => {
      const dto = new UpdateUserDto();
      dto.phoneNumber = '0612345678';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'phoneNumber')).toBe(true);
    });

    it('should fail with a number containing non-digit characters', async () => {
      const dto = new UpdateUserDto();
      dto.phoneNumber = '+336-12-34-56-78';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'phoneNumber')).toBe(true);
    });
  });
});
