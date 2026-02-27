import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles, RolesGuard } from '@shared/authorization';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { SendNotificationDto } from '../../core/application/dtos/send-notification.dto';
import { NotificationResponseDto } from '../../core/application/dtos/notification-response.dto';
import {
  NotificationChannel,
  NotificationChannelValues,
  isValidNotificationChannel,
} from '../../core/domain/value-objects/notification-channel.vo';
import {
  NotificationStatus,
  NotificationStatusValues,
} from '../../core/domain/value-objects/notification-status.vo';
import { NotificationType } from '../../core/domain/value-objects/notification-type.vo';
import { SendNotificationCommand } from '../../core/application/commands/send-notification/send-notification.command';
import { MarkAsReadCommand } from '../../core/application/commands/mark-as-read/mark-as-read.command';
import { MarkAllAsReadCommand } from '../../core/application/commands/mark-all-as-read/mark-all-as-read.command';
import { DeleteNotificationCommand } from '../../core/application/commands/delete-notification/delete-notification.command';
import { GetNotificationsQuery } from '../../core/application/queries/get-notifications/get-notifications.query';
import { PaginatedResponseDto } from '@modules/user/core/application/dtos/pagination.dto';
import {
  ITemplateRenderer,
  TEMPLATE_RENDERER,
} from '../../core/application/services/template-renderer.service';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../core/domain/repositories/notification.repository.interface';

@Controller('notifications')
@ApiTags('Notifications')
export class NotificationHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(TEMPLATE_RENDERER)
    private readonly templateRenderer: ITemplateRenderer,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    private readonly configService: ConfigService,
  ) {}

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Envoyer une notification (Admin uniquement)' })
  @ApiResponse({
    status: 201,
    description: 'Notification(s) envoyée(s)',
    type: [NotificationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async send(@Body() dto: SendNotificationDto): Promise<NotificationResponseDto[]> {
    const command = new SendNotificationCommand(
      dto.userIds,
      dto.type,
      dto.channels,
      dto.variables,
      dto.locale,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer mes notifications (paginé)' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: "Nombre d'éléments par page",
    example: 10,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filtrer par type (ex: welcome, generic)',
    example: 'generic',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'Filtrer par canal',
    enum: NotificationChannelValues,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrer par statut',
    enum: NotificationStatusValues,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des notifications',
    type: PaginatedResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Paramètre de filtre invalide' })
  async getMyNotifications(
    @CurrentUser() user: { userId: string },
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('type') typeParam?: string,
    @Query('channel') channelParam?: string,
    @Query('status') statusParam?: string,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    let type: string | undefined;
    let channel: NotificationChannel | undefined;
    let status: NotificationStatus | undefined;

    if (typeParam !== undefined) {
      try {
        type = new NotificationType(typeParam).value;
      } catch {
        throw new BadRequestException(`Type de notification invalide: ${typeParam}`);
      }
    }

    if (channelParam !== undefined) {
      if (!isValidNotificationChannel(channelParam)) {
        throw new BadRequestException(
          `Canal invalide: ${channelParam}. Valeurs acceptées: ${NotificationChannelValues.join(', ')}`,
        );
      }
      channel = channelParam;
    }

    if (statusParam !== undefined) {
      if (!NotificationStatusValues.includes(statusParam as NotificationStatus)) {
        throw new BadRequestException(
          `Statut invalide: ${statusParam}. Valeurs acceptées: ${NotificationStatusValues.join(', ')}`,
        );
      }
      status = statusParam as NotificationStatus;
    }

    const query = new GetNotificationsQuery(
      user.userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      type,
      channel,
      status,
    );
    return this.queryBus.execute(query);
  }

  @Patch('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Marquer une ou toutes les notifications comme lues' })
  @ApiQuery({
    name: 'id',
    required: false,
    description:
      'ID de la notification à marquer comme lue (si absent : toutes les notifications SENT)',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'Filtrer par canal (ignoré si id est fourni)',
    enum: NotificationChannelValues,
  })
  @ApiResponse({ status: 204, description: 'Notification marquée comme lue' })
  @ApiResponse({
    status: 200,
    description: 'Nombre de notifications marquées comme lues',
    schema: { properties: { count: { type: 'number' } } },
  })
  @ApiResponse({ status: 400, description: 'Paramètre invalide' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async markAsRead(
    @CurrentUser() user: { userId: string },
    @Query('id') id?: string,
    @Query('channel') channelParam?: string,
  ): Promise<{ count: number } | void> {
    if (id !== undefined) {
      await this.commandBus.execute(new MarkAsReadCommand(id, user.userId));
      return;
    }

    let channel: NotificationChannel | undefined;
    if (channelParam !== undefined) {
      if (!isValidNotificationChannel(channelParam)) {
        throw new BadRequestException(
          `Canal invalide: ${channelParam}. Valeurs acceptées: ${NotificationChannelValues.join(', ')}`,
        );
      }
      channel = channelParam;
    }

    return this.commandBus.execute(new MarkAllAsReadCommand(user.userId, channel));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer une notification' })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 204, description: 'Notification supprimée' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ): Promise<void> {
    await this.commandBus.execute(new DeleteNotificationCommand(id, user.userId));
  }

  @Get('unread-count')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  @ApiQuery({
    name: 'channel',
    required: false,
    description: 'Filtrer par canal',
    enum: NotificationChannelValues,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrer par statut (défaut: SENT)',
    enum: NotificationStatusValues,
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre de notifications non lues',
    schema: { properties: { count: { type: 'number' } } },
  })
  @ApiResponse({ status: 400, description: 'Paramètre de filtre invalide' })
  async getUnreadCount(
    @CurrentUser() user: { userId: string },
    @Query('channel') channelParam?: string,
    @Query('status') statusParam: string = 'SENT',
  ): Promise<{ count: number }> {
    let channel: NotificationChannel | undefined;

    if (channelParam !== undefined) {
      if (!isValidNotificationChannel(channelParam)) {
        throw new BadRequestException(
          `Canal invalide: ${channelParam}. Valeurs acceptées: ${NotificationChannelValues.join(', ')}`,
        );
      }
      channel = channelParam;
    }

    if (!NotificationStatusValues.includes(statusParam as NotificationStatus)) {
      throw new BadRequestException(
        `Statut invalide: ${statusParam}. Valeurs acceptées: ${NotificationStatusValues.join(', ')}`,
      );
    }

    const count = await this.notificationRepository.countByUserAndStatus(
      user.userId,
      statusParam as NotificationStatus,
      channel,
    );
    return { count };
  }

  @Get('preview/:type')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Prévisualiser un template (Admin, dev uniquement)',
  })
  @ApiParam({ name: 'type', description: 'Type de notification', example: 'welcome' })
  @ApiQuery({ name: 'lang', required: false, description: 'Langue', example: 'fr' })
  @ApiQuery({ name: 'channel', required: false, description: 'Canal', example: 'EMAIL' })
  @ApiResponse({
    status: 200,
    description: 'Template rendu',
    schema: {
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
      },
    },
  })
  preview(
    @Param('type') type: string,
    @Query('lang') lang: string = 'fr',
    @Query('channel') channel: string = 'EMAIL',
  ): { subject?: string; body: string } {
    const sampleVars = {
      firstName: 'Jean',
      lastName: 'Dupont',
      appName: 'Starter API',
      resetLink: 'https://example.com/reset?token=abc123',
      code: '123456',
      expiresIn: '15 minutes',
    };

    return this.templateRenderer.render(type, channel as NotificationChannel, lang, sampleVars);
  }
}
