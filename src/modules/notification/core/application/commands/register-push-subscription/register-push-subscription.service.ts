import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterPushSubscriptionCommand } from './register-push-subscription.command';
import { PushSubscription } from '../../../domain/entities/push-subscription.entity';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '../../../domain/repositories/push-subscription.repository.interface';
import { PushSubscriptionResponseDto } from '../../dtos/push-subscription-response.dto';

@Injectable()
@CommandHandler(RegisterPushSubscriptionCommand)
export class RegisterPushSubscriptionService implements ICommandHandler<RegisterPushSubscriptionCommand> {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptionRepository: IPushSubscriptionRepository,
  ) {}

  async execute(command: RegisterPushSubscriptionCommand): Promise<PushSubscriptionResponseDto> {
    const subscription = new PushSubscription({
      userId: command.userId,
      endpoint: command.endpoint,
      p256dh: command.p256dh,
      auth: command.auth,
    });

    const saved = await this.pushSubscriptionRepository.save(subscription);
    return PushSubscriptionResponseDto.fromDomain(saved);
  }
}
