import { ICommand } from '@nestjs/cqrs';

export class UpdateUserCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phoneNumber?: string | null,
  ) {}
}
