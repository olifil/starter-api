export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly resetToken: string,
    public readonly expiresIn: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
