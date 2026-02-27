import { ICommand } from '@nestjs/cqrs';

export class DeleteNotificationCommand implements ICommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
  ) {}
}
