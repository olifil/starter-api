import {
  Controller,
  Get,
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
import { NotificationChannel } from '../../core/domain/value-objects/notification-channel.vo';
import { SendNotificationCommand } from '../../core/application/commands/send-notification/send-notification.command';
import { MarkAsReadCommand } from '../../core/application/commands/mark-as-read/mark-as-read.command';
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Numéro de page',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: "Nombre d'éléments par page",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des notifications',
  })
  async getMyNotifications(
    @CurrentUser() user: { userId: string },
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    const query = new GetNotificationsQuery(
      user.userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
    return this.queryBus.execute(query);
  }

  @Patch(':id/read')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({ status: 200, description: 'Notification marquée comme lue' })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ): Promise<NotificationResponseDto> {
    const command = new MarkAsReadCommand(id, user.userId);
    return this.commandBus.execute(command);
  }

  @Get('unread-count')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues' })
  async getUnreadCount(@CurrentUser() user: { userId: string }): Promise<{ count: number }> {
    const count = await this.notificationRepository.countByUserAndStatus(user.userId, 'SENT');
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
  @ApiResponse({ status: 200, description: 'Template rendu' })
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
