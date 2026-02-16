import { ApiProperty } from '@nestjs/swagger';
import { PushSubscription } from '../../domain/entities/push-subscription.entity';

export class PushSubscriptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() endpoint!: string;
  @ApiProperty() createdAt!: Date;

  static fromDomain(sub: PushSubscription): PushSubscriptionResponseDto {
    const dto = new PushSubscriptionResponseDto();
    dto.id = sub.id;
    dto.userId = sub.userId;
    dto.endpoint = sub.endpoint;
    dto.createdAt = sub.createdAt;
    return dto;
  }
}
