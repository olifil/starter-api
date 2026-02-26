export class EmailChangeRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly firstName: string,
    public readonly newEmail: string,
    public readonly confirmationToken: string,
    public readonly expiresIn: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
