import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import UserModule pour accéder à USER_REPOSITORY
import { UserModule } from '@modules/user/user.module';

// Application - Services (Commands)
import { RegisterService } from './core/application/commands/register/register.service';
import { RefreshTokenService } from './core/application/commands/refresh-token/refresh-token.service';
import { ForgotPasswordService } from './core/application/commands/forgot-password/forgot-password.service';
import { ResetPasswordService } from './core/application/commands/reset-password/reset-password.service';
import { VerifyEmailService } from './core/application/commands/verify-email/verify-email.service';
import { LogoutService } from './core/application/commands/logout/logout.service';
import { RevokeSessionsService } from './core/application/commands/revoke-sessions/revoke-sessions.service';

// Infrastructure - Repositories
import { REFRESH_TOKEN_REPOSITORY } from './core/domain/repositories/refresh-token.repository.interface';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/repositories/prisma-refresh-token.repository';

// Application - Handlers (Queries)
import { LoginHandler } from './core/application/queries/login/login.handler';

// Interface
import { AuthHttpController } from './interface/http-controller/auth.http-controller';
import { JwtStrategy } from './interface/guards/jwt.strategy';
import { JwtAuthGuard } from './interface/guards/jwt-auth.guard';

const CommandServices = [
  RegisterService,
  RefreshTokenService,
  ForgotPasswordService,
  ResetPasswordService,
  VerifyEmailService,
  LogoutService,
  RevokeSessionsService,
];
const QueryHandlers = [LoginHandler];

@Module({
  imports: [
    UserModule, // Import pour accéder à USER_REPOSITORY
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    CqrsModule,
  ],
  controllers: [AuthHttpController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    ...CommandServices,
    ...QueryHandlers,
  ],
  exports: [
    JwtStrategy,
    PassportModule,
    JwtAuthGuard, // Exporté pour utilisation dans d'autres modules
  ],
})
export class AuthModule {}
