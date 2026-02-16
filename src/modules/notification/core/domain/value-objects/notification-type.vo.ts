export class InvalidNotificationTypeException extends Error {
  constructor(type: string) {
    super(`Type de notification invalide: ${type}`);
    this.name = 'InvalidNotificationTypeException';
  }
}

export class NotificationType {
  private readonly _value: string;
  private static readonly TYPE_REGEX = /^[a-z][a-z0-9-]*$/;

  constructor(type: string) {
    const normalized = type.trim().toLowerCase();
    if (!NotificationType.TYPE_REGEX.test(normalized)) {
      throw new InvalidNotificationTypeException(type);
    }
    this._value = normalized;
  }

  get value(): string {
    return this._value;
  }

  equals(other: NotificationType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
