import {
  HashedPassword,
  PasswordInvalidException,
} from '@modules/user/core/domain/value-objects/hashed-password.vo';
import * as bcrypt from 'bcrypt';

describe('HashedPassword Value Object', () => {
  describe('fromPlainPassword', () => {
    it('should create hashed password from valid plain password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';

      // Act
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Assert
      expect(hashedPassword).toBeInstanceOf(HashedPassword);
      expect(hashedPassword.hash).toBeDefined();
      expect(hashedPassword.hash).not.toBe(plainPassword);
    });

    it('should hash password using bcrypt', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';

      // Act
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Assert
      // Verify it uses bcrypt by checking the hash format (bcrypt hashes start with $2b$)
      expect(hashedPassword.hash).toMatch(/^\$2[aby]\$/);
    });

    it('should create different hashes for same password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';

      // Act
      const hash1 = await HashedPassword.fromPlainPassword(plainPassword);
      const hash2 = await HashedPassword.fromPlainPassword(plainPassword);

      // Assert
      expect(hash1.hash).not.toBe(hash2.hash);
    });

    describe('password validation', () => {
      it('should throw exception for password shorter than 8 characters', async () => {
        // Arrange
        const shortPassword = 'Pass1!';

        // Act & Assert
        await expect(HashedPassword.fromPlainPassword(shortPassword)).rejects.toThrow(
          PasswordInvalidException,
        );
        await expect(HashedPassword.fromPlainPassword(shortPassword)).rejects.toThrow(
          'Le mot de passe doit contenir au moins 8 caractères',
        );
      });

      it('should throw exception for password without uppercase letter', async () => {
        // Arrange
        const noUppercase = 'password123!';

        // Act & Assert
        await expect(HashedPassword.fromPlainPassword(noUppercase)).rejects.toThrow(
          PasswordInvalidException,
        );
        await expect(HashedPassword.fromPlainPassword(noUppercase)).rejects.toThrow(
          'Le mot de passe doit contenir entre 8 et 128 caractères',
        );
      });

      it('should throw exception for password without lowercase letter', async () => {
        // Arrange
        const noLowercase = 'PASSWORD123!';

        // Act & Assert
        await expect(HashedPassword.fromPlainPassword(noLowercase)).rejects.toThrow(
          PasswordInvalidException,
        );
      });

      it('should throw exception for password without digit', async () => {
        // Arrange
        const noDigit = 'Password!@#$';

        // Act & Assert
        await expect(HashedPassword.fromPlainPassword(noDigit)).rejects.toThrow(
          PasswordInvalidException,
        );
      });

      it('should throw exception for password without special character', async () => {
        // Arrange
        const noSpecial = 'Password123';

        // Act & Assert
        await expect(HashedPassword.fromPlainPassword(noSpecial)).rejects.toThrow(
          PasswordInvalidException,
        );
      });

      it('should accept password with all required characters', async () => {
        // Arrange
        const validPasswords = [
          'Password123!',
          'MyP@ssw0rd',
          'Str0ng$Pass',
          'C0mpl3x&Pass',
          'S3cur3*Password',
        ];

        // Act & Assert
        for (const password of validPasswords) {
          await expect(HashedPassword.fromPlainPassword(password)).resolves.toBeInstanceOf(
            HashedPassword,
          );
        }
      });

      it('should accept minimum length password with all requirements', async () => {
        // Arrange
        const minPassword = 'Pass123!';

        // Act
        const result = await HashedPassword.fromPlainPassword(minPassword);

        // Assert
        expect(result).toBeInstanceOf(HashedPassword);
      });
    });
  });

  describe('fromHash', () => {
    it('should create hashed password from existing hash', () => {
      // Arrange
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz';

      // Act
      const hashedPassword = HashedPassword.fromHash(hash);

      // Assert
      expect(hashedPassword).toBeInstanceOf(HashedPassword);
      expect(hashedPassword.hash).toBe(hash);
    });

    it('should not validate hash format', () => {
      // Arrange
      const invalidHash = 'not-a-real-hash';

      // Act
      const hashedPassword = HashedPassword.fromHash(invalidHash);

      // Assert
      expect(hashedPassword).toBeInstanceOf(HashedPassword);
      expect(hashedPassword.hash).toBe(invalidHash);
    });
  });

  describe('hash getter', () => {
    it('should return the hash value', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Act
      const hash = hashedPassword.hash;

      // Assert
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('verify', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Act
      const result = await hashedPassword.verify(plainPassword);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const wrongPassword = 'WrongPass123!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Act
      const result = await hashedPassword.verify(wrongPassword);

      // Assert
      expect(result).toBe(false);
    });

    it('should correctly verify password using bcrypt', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Act
      const correctResult = await hashedPassword.verify(plainPassword);
      const incorrectResult = await hashedPassword.verify('WrongPass123!');

      // Assert
      expect(correctResult).toBe(true);
      expect(incorrectResult).toBe(false);
    });

    it('should handle case-sensitive passwords', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const wrongCase = 'validpass123!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);

      // Act
      const result = await hashedPassword.verify(wrongCase);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same hash', () => {
      // Arrange
      const hash = '$2b$10$abcdefghijklmnopqrstuvwxyz';
      const password1 = HashedPassword.fromHash(hash);
      const password2 = HashedPassword.fromHash(hash);

      // Act
      const result = password1.equals(password2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for different hashes', async () => {
      // Arrange
      const password1 = await HashedPassword.fromPlainPassword('ValidPass123!');
      const password2 = await HashedPassword.fromPlainPassword('OtherPass456!');

      // Act
      const result = password1.equals(password2);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false even for same plain password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const password1 = await HashedPassword.fromPlainPassword(plainPassword);
      const password2 = await HashedPassword.fromPlainPassword(plainPassword);

      // Act
      const result = password1.equals(password2);

      // Assert
      expect(result).toBe(false); // Different salts produce different hashes
    });
  });
});

describe('PasswordInvalidException', () => {
  it('should create exception with custom message', () => {
    // Arrange
    const message = 'Password is too weak';

    // Act
    const exception = new PasswordInvalidException(message);

    // Assert
    expect(exception.message).toBe(message);
    expect(exception.name).toBe('PasswordInvalidException');
  });

  it('should be instance of Error', () => {
    // Act
    const exception = new PasswordInvalidException('test');

    // Assert
    expect(exception).toBeInstanceOf(Error);
  });
});
