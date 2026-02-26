import { ICommand } from '@nestjs/cqrs';

export class UpdateMeCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly newEmail?: string,
    public readonly currentPassword?: string,
    public readonly newPassword?: string,
  ) {}
}
