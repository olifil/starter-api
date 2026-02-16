import * as bcrypt from 'bcrypt';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_RULES_MESSAGE,
} from '@shared/validation/password.validator';

export class PasswordInvalidException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordInvalidException';
  }
}

export class HashedPassword {
  private readonly _hash: string;

  private static readonly SALT_ROUNDS = 10;

  private constructor(hash: string) {
    this._hash = hash;
  }

  static async fromPlainPassword(plainPassword: string): Promise<HashedPassword> {
    this.validatePasswordRules(plainPassword);
    const hash = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
    return new HashedPassword(hash);
  }

  static fromHash(hash: string): HashedPassword {
    return new HashedPassword(hash);
  }

  get hash(): string {
    return this._hash;
  }

  async verify(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this._hash);
  }

  private static validatePasswordRules(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new PasswordInvalidException(
        `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
      );
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      throw new PasswordInvalidException(
        `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères`,
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      throw new PasswordInvalidException(PASSWORD_RULES_MESSAGE);
    }
  }

  equals(other: HashedPassword): boolean {
    return this._hash === other._hash;
  }
}
