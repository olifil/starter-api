import { Email, EmailInvalidException } from '@modules/user/core/domain/value-objects/email.vo';

describe('Email Value Object', () => {
  describe('constructor', () => {
    it('should create email with valid format', () => {
      // Act
      const email = new Email('test@example.com');

      // Assert
      expect(email.value).toBe('test@example.com');
    });

    it('should normalize email to lowercase', () => {
      // Act
      const email = new Email('Test@Example.COM');

      // Assert
      expect(email.value).toBe('test@example.com');
    });

    it('should trim whitespace from email', () => {
      // Act
      const email = new Email('  test@example.com  ');

      // Assert
      expect(email.value).toBe('test@example.com');
    });

    it('should throw EmailInvalidException for empty email', () => {
      // Act & Assert
      expect(() => new Email('')).toThrow(EmailInvalidException);
    });

    it('should throw EmailInvalidException for email without @', () => {
      // Act & Assert
      expect(() => new Email('testexample.com')).toThrow(EmailInvalidException);
    });

    it('should throw EmailInvalidException for email without domain', () => {
      // Act & Assert
      expect(() => new Email('test@')).toThrow(EmailInvalidException);
    });

    it('should throw EmailInvalidException for email without TLD', () => {
      // Act & Assert
      expect(() => new Email('test@example')).toThrow(EmailInvalidException);
    });

    it('should throw EmailInvalidException for email with spaces', () => {
      // Act & Assert
      expect(() => new Email('test @example.com')).toThrow(EmailInvalidException);
      expect(() => new Email('test@ example.com')).toThrow(EmailInvalidException);
    });

    it('should accept email with plus sign', () => {
      // Act
      const email = new Email('test+tag@example.com');

      // Assert
      expect(email.value).toBe('test+tag@example.com');
    });

    it('should accept email with dots in local part', () => {
      // Act
      const email = new Email('first.last@example.com');

      // Assert
      expect(email.value).toBe('first.last@example.com');
    });

    it('should accept email with subdomain', () => {
      // Act
      const email = new Email('test@mail.example.com');

      // Assert
      expect(email.value).toBe('test@mail.example.com');
    });

    it('should accept email with hyphen in domain', () => {
      // Act
      const email = new Email('test@my-domain.com');

      // Assert
      expect(email.value).toBe('test@my-domain.com');
    });
  });

  describe('value getter', () => {
    it('should return the email value', () => {
      // Arrange
      const email = new Email('test@example.com');

      // Act
      const value = email.value;

      // Assert
      expect(value).toBe('test@example.com');
    });
  });

  describe('equals', () => {
    it('should return true for same email', () => {
      // Arrange
      const email1 = new Email('test@example.com');
      const email2 = new Email('test@example.com');

      // Act
      const result = email1.equals(email2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for different emails', () => {
      // Arrange
      const email1 = new Email('test1@example.com');
      const email2 = new Email('test2@example.com');

      // Act
      const result = email1.equals(email2);

      // Assert
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      // Arrange
      const email1 = new Email('Test@Example.com');
      const email2 = new Email('test@example.com');

      // Act
      const result = email1.equals(email2);

      // Assert
      expect(result).toBe(true);
    });

    it('should ignore whitespace differences', () => {
      // Arrange
      const email1 = new Email('  test@example.com  ');
      const email2 = new Email('test@example.com');

      // Act
      const result = email1.equals(email2);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return email value as string', () => {
      // Arrange
      const email = new Email('test@example.com');

      // Act
      const result = email.toString();

      // Assert
      expect(result).toBe('test@example.com');
    });

    it('should return normalized email', () => {
      // Arrange
      const email = new Email('Test@Example.COM');

      // Act
      const result = email.toString();

      // Assert
      expect(result).toBe('test@example.com');
    });
  });
});

describe('EmailInvalidException', () => {
  it('should create exception with email in message', () => {
    // Act
    const exception = new EmailInvalidException('invalid-email');

    // Assert
    expect(exception.message).toBe('Email invalide: invalid-email');
    expect(exception.name).toBe('EmailInvalidException');
  });

  it('should be instance of Error', () => {
    // Act
    const exception = new EmailInvalidException('test');

    // Assert
    expect(exception).toBeInstanceOf(Error);
  });
});
