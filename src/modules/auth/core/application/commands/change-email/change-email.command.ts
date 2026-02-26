import { ICommand } from '@nestjs/cqrs';

export class ChangeEmailCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newEmail: string,
  ) {}
}
