import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePushSubscriptionCommand } from './delete-push-subscription.command';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '../../../domain/repositories/push-subscription.repository.interface';

@Injectable()
@CommandHandler(DeletePushSubscriptionCommand)
export class DeletePushSubscriptionService implements ICommandHandler<DeletePushSubscriptionCommand> {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptionRepository: IPushSubscriptionRepository,
  ) {}

  async execute(command: DeletePushSubscriptionCommand): Promise<void> {
    await this.pushSubscriptionRepository.deleteByEndpoint(command.endpoint);
  }
}
