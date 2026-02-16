export class AccountVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly occurredOn: Date = new Date(),
  ) {}
}
