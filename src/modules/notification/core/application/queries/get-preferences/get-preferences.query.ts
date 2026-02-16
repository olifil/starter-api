import { IQuery } from '@nestjs/cqrs';

export class GetPreferencesQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
