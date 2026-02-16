import { PushSubscription } from '../entities/push-subscription.entity';

export interface IPushSubscriptionRepository {
  save(subscription: PushSubscription): Promise<PushSubscription>;
  findByUserId(userId: string): Promise<PushSubscription[]>;
  deleteByEndpoint(endpoint: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol('PUSH_SUBSCRIPTION_REPOSITORY');
