import { ICommand } from '@nestjs/cqrs';

export class RevokeSessionsCommand implements ICommand {
  constructor(
    public readonly requesterId: string,
    public readonly requesterRole: string,
    public readonly targetUserId: string,
  ) {}
}
