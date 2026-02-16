import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserProfileDto } from '../../core/application/dtos/user-profile.dto';
import { PaginatedResponseDto } from '../../core/application/dtos/pagination.dto';
import { GetUserQuery } from '../../core/application/queries/get-user/get-user.query';
import { GetUsersQuery } from '../../core/application/queries/get-users/get-users.query';
import { SearchUsersQuery } from '../../core/application/queries/search-users/search-users.query';
import { DeleteUserCommand } from '../../core/application/commands/delete-user/delete-user.command';
import { Roles, RolesGuard } from '@shared/authorization';
import { Role } from '@prisma/client';

@Controller('users')
@ApiTags('Users')
export class UserHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer la liste paginée des utilisateurs (Admin uniquement)' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de la page', example: 1 })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: "Nombre d'éléments par page",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des utilisateurs',
    type: PaginatedResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Rôle Admin requis' })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ): Promise<PaginatedResponseDto<UserProfileDto>> {
    const pageNumber = parseInt(page, 10);
    const pageSizeNumber = parseInt(pageSize, 10);

    const query = new GetUsersQuery(pageNumber, pageSizeNumber);
    return this.queryBus.execute(query);
  }

  @Get('search')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Rechercher des utilisateurs par nom (autocomplétion, Admin uniquement)',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Terme de recherche (min 2 caractères)',
    example: 'jean',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre max de résultats (défaut 10, max 20)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche',
    type: [UserProfileDto],
  })
  @ApiResponse({ status: 400, description: 'Terme de recherche trop court (min 2 caractères)' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Rôle Admin requis' })
  async searchUsers(
    @Query('q') q: string,
    @Query('limit') limit: string = '10',
  ): Promise<UserProfileDto[]> {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Le terme de recherche doit contenir au moins 2 caractères');
    }

    const limitNumber = Math.min(parseInt(limit, 10) || 10, 20);
    const query = new SearchUsersQuery(q.trim(), limitNumber);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID (Admin uniquement)' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur trouvé',
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Rôle Admin requis' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getUser(@Param('id') id: string): Promise<UserProfileDto> {
    const query = new GetUserQuery(id);
    return this.queryBus.execute(query);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer un utilisateur (Admin uniquement)' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur à supprimer" })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - Rôle Admin requis' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async deleteUser(@Param('id') id: string): Promise<void> {
    const command = new DeleteUserCommand(id);
    return this.commandBus.execute(command);
  }
}
