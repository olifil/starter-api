export class UserDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
