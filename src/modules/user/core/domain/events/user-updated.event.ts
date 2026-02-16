export interface ProfileChanges {
  firstName?: { old: string; new: string };
  lastName?: { old: string; new: string };
  email?: { old: string; new: string };
}

export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: ProfileChanges,
    public readonly timestamp: Date = new Date(),
  ) {}
}
