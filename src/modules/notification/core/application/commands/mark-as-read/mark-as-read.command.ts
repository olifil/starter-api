import { ICommand } from '@nestjs/cqrs';

export class MarkAsReadCommand implements ICommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
  ) {}
}
