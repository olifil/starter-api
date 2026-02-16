import { Controller, Post, Delete, Get, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { RegisterPushSubscriptionDto } from '../../core/application/dtos/register-push-subscription.dto';
import { DeletePushSubscriptionDto } from '../../core/application/dtos/delete-push-subscription.dto';
import { PushSubscriptionResponseDto } from '../../core/application/dtos/push-subscription-response.dto';
import { RegisterPushSubscriptionCommand } from '../../core/application/commands/register-push-subscription/register-push-subscription.command';
import { DeletePushSubscriptionCommand } from '../../core/application/commands/delete-push-subscription/delete-push-subscription.command';
import {
  IPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_REPOSITORY,
} from '../../core/domain/repositories/push-subscription.repository.interface';

@Controller('notifications/push-subscriptions')
@ApiTags('Push Subscriptions')
@ApiBearerAuth('access-token')
export class PushSubscriptionHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptionRepository: IPushSubscriptionRepository,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Enregistrer une souscription Web Push',
    description:
      'Enregistre ou met à jour la souscription Web Push du navigateur courant. La clé VAPID publique à utiliser est disponible via GET /notifications/push-subscriptions/vapid-public-key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Souscription enregistrée',
    type: PushSubscriptionResponseDto,
  })
  async register(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterPushSubscriptionDto,
  ): Promise<PushSubscriptionResponseDto> {
    const command = new RegisterPushSubscriptionCommand(
      user.userId,
      dto.endpoint,
      dto.p256dh,
      dto.auth,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes souscriptions Web Push actives' })
  @ApiResponse({
    status: 200,
    description: 'Liste des souscriptions',
    type: [PushSubscriptionResponseDto],
  })
  async getMySubscriptions(
    @CurrentUser() user: { userId: string },
  ): Promise<PushSubscriptionResponseDto[]> {
    const subs = await this.pushSubscriptionRepository.findByUserId(user.userId);
    return subs.map((s) => PushSubscriptionResponseDto.fromDomain(s));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une souscription Web Push',
    description: 'Appelé lors du désabonnement navigateur (pushManager.unsubscribe()).',
  })
  @ApiBody({ type: DeletePushSubscriptionDto })
  @ApiResponse({ status: 204, description: 'Souscription supprimée' })
  async delete(
    @CurrentUser() user: { userId: string },
    @Body() dto: DeletePushSubscriptionDto,
  ): Promise<void> {
    const command = new DeletePushSubscriptionCommand(user.userId, dto.endpoint);
    await this.commandBus.execute(command);
  }
}
