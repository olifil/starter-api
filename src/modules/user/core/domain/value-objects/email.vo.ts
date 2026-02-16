export class EmailInvalidException extends Error {
  constructor(email: string) {
    super(`Email invalide: ${email}`);
    this.name = 'EmailInvalidException';
  }
}

export class Email {
  private readonly _value: string;

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(email: string) {
    const normalized = this.normalize(email);

    if (!this.isValid(normalized)) {
      throw new EmailInvalidException(email);
    }

    this._value = normalized;
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private isValid(email: string): boolean {
    return Email.EMAIL_REGEX.test(email);
  }

  toString(): string {
    return this._value;
  }
}
