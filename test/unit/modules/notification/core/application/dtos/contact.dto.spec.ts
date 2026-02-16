import { validate } from 'class-validator';
import { ContactDto } from '@modules/notification/core/application/dtos/contact.dto';

describe('ContactDto', () => {
  const createValidDto = (): ContactDto => {
    const dto = new ContactDto();
    dto.senderName = 'John Doe';
    dto.senderEmail = 'john@example.com';
    dto.subject = 'Hello there';
    dto.body = 'This is the message body.';
    return dto;
  };

  describe('valid cases', () => {
    it('should pass with all valid fields', async () => {
      const dto = createValidDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('senderName validation', () => {
    it('should fail with an empty senderName', async () => {
      const dto = createValidDto();
      dto.senderName = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('senderName');
    });

    it('should fail with senderName exceeding 100 characters', async () => {
      const dto = createValidDto();
      dto.senderName = 'a'.repeat(101);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('senderName');
    });
  });

  describe('senderEmail validation', () => {
    it('should fail with an invalid email format', async () => {
      const dto = createValidDto();
      dto.senderEmail = 'not-an-email';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('senderEmail');
    });
  });

  describe('subject validation', () => {
    it('should fail with subject exceeding 200 characters', async () => {
      const dto = createValidDto();
      dto.subject = 'a'.repeat(201);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('subject');
    });
  });

  describe('body validation', () => {
    it('should fail with body exceeding 5000 characters', async () => {
      const dto = createValidDto();
      dto.body = 'a'.repeat(5001);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('body');
    });
  });
});
