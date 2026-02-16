import { Controller, Get, Put, Body } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { UpdatePreferencesDto } from '../../core/application/dtos/update-preferences.dto';
import { NotificationPreferenceResponseDto } from '../../core/application/dtos/notification-preference-response.dto';
import { UpdatePreferencesCommand } from '../../core/application/commands/update-preferences/update-preferences.command';
import { GetPreferencesQuery } from '../../core/application/queries/get-preferences/get-preferences.query';

@Controller('notifications/preferences')
@ApiTags('Notification Preferences')
export class NotificationPreferenceHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer mes préférences de notification' })
  @ApiResponse({
    status: 200,
    description: 'Préférences récupérées',
    type: [NotificationPreferenceResponseDto],
  })
  async getMyPreferences(
    @CurrentUser() user: { userId: string },
  ): Promise<NotificationPreferenceResponseDto[]> {
    const query = new GetPreferencesQuery(user.userId);
    return this.queryBus.execute(query);
  }

  @Put()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mettre à jour mes préférences de notification' })
  @ApiResponse({
    status: 200,
    description: 'Préférences mises à jour',
    type: [NotificationPreferenceResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async updateMyPreferences(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const command = new UpdatePreferencesCommand(user.userId, dto.preferences);
    return this.commandBus.execute(command);
  }
}
