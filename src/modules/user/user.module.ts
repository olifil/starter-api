import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain
import { USER_REPOSITORY } from './core/domain/repositories/user.repository.interface';

// Application - Services (Commands)
import { CreateUserService } from './core/application/commands/create-user/create-user.service';
import { UpdateUserService } from './core/application/commands/update-user/update-user.service';
import { DeleteUserService } from './core/application/commands/delete-user/delete-user.service';

// Application - Handlers (Queries)
import { GetUserHandler } from './core/application/queries/get-user/get-user.handler';
import { GetUserByEmailHandler } from './core/application/queries/get-user-by-email/get-user-by-email.handler';
import { GetUsersHandler } from './core/application/queries/get-users/get-users.handler';
import { SearchUsersHandler } from './core/application/queries/search-users/search-users.handler';

// Infrastructure
import { PrismaUserRepository } from './infrastructure/persistence/repositories/prisma-user.repository';

// Interface
import { MeHttpController } from './interface/http-controller/me.http-controller';
import { UserHttpController } from './interface/http-controller/user.http-controller';

// Auth Module (pour les Guards)
import { AuthModule } from '@modules/auth/auth.module';

const CommandServices = [CreateUserService, UpdateUserService, DeleteUserService];

const QueryHandlers = [GetUserHandler, GetUserByEmailHandler, GetUsersHandler, SearchUsersHandler];

const httpControllers = [MeHttpController, UserHttpController];

@Module({
  imports: [CqrsModule, forwardRef(() => AuthModule)],
  controllers: [...httpControllers],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    ...CommandServices,
    ...QueryHandlers,
  ],
  exports: [
    USER_REPOSITORY, // Exporté pour que le module Auth puisse l'utiliser
  ],
})
export class UserModule {}
