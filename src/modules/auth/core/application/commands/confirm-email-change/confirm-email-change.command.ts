import { ICommand } from '@nestjs/cqrs';

export class ConfirmEmailChangeCommand implements ICommand {
  constructor(public readonly token: string) {}
}
