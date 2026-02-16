import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
  I18nYamlLoader,
} from 'nestjs-i18n';
import * as path from 'path';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { PrismaModule } from './database/prisma.module';
import { MatomoModule } from '@shared/infrastructure/analytics';
import { HealthModule } from '@shared/infrastructure/health/health.module';
import { RequestIdMiddleware } from '@shared/infrastructure/logging/request-id.middleware';
import { pinoConfig } from '@shared/infrastructure/logging/pino.config';
import { AuthorizationModule } from '@shared/authorization';
import { AbilitiesGuard } from '@shared/authorization';
import { JwtAuthGuard } from '@modules/auth/interface/guards/jwt-auth.guard';
import appConfig from '@config/app.config';
import databaseConfig from '@config/database.config';
import jwtConfig from '@config/jwt.config';
import matomoConfig from '@config/matomo.config';
import notificationConfig from '@config/notification.config';
import throttleConfig from '@config/throttle.config';
import { validate } from '@config/env.validation';

const modules = [
  ConfigModule.forRoot({
    isGlobal: true,
    load: [appConfig, databaseConfig, jwtConfig, matomoConfig, notificationConfig, throttleConfig],
    envFilePath: '.env',
    validate,
  }),
  LoggerModule.forRoot(pinoConfig),
  ScheduleModule.forRoot(),

  // Rate limiting
  ThrottlerModule.forRootAsync({
    useFactory: (configService: ConfigService) => ({
      throttlers: [
        {
          name: 'default',
          ttl: configService.get<number>('throttle.default.ttl', 60_000),
          limit: configService.get<number>('throttle.default.limit', 30),
        },
        {
          name: 'strict',
          ttl: configService.get<number>('throttle.strict.ttl', 60_000),
          limit: configService.get<number>('throttle.strict.limit', 5),
        },
      ],
    }),
    inject: [ConfigService],
  }),

  // BullMQ (Redis)
  BullModule.forRootAsync({
    useFactory: (configService: ConfigService) => ({
      connection: {
        host: configService.get<string>('notification.redis.host', 'localhost'),
        port: configService.get<number>('notification.redis.port', 6379),
        password: configService.get<string>('notification.redis.password') || undefined,
      },
    }),
    inject: [ConfigService],
  }),

  // i18n
  I18nModule.forRootAsync({
    loader: I18nYamlLoader,
    useFactory: (configService: ConfigService) => ({
      fallbackLanguage: configService.get<string>('notification.i18n.fallbackLanguage', 'fr'),
      loaderOptions: {
        path: path.join(process.cwd(), 'src', 'modules', 'notification', 'resources', 'i18n'),
        filePattern: '*.yaml',
        watch: configService.get<string>('app.nodeEnv') === 'development',
      },
    }),
    resolvers: [
      { use: QueryResolver, options: ['lang'] },
      AcceptLanguageResolver,
      new HeaderResolver(['x-lang']),
    ],
    inject: [ConfigService],
  }),

  PrismaModule,
  MatomoModule,
  HealthModule,
  AuthorizationModule,
  AuthModule,
  UserModule,
  NotificationModule,
];

@Module({
  imports: [...modules],
  controllers: [],
  providers: [
    // Guards globaux dans l'ordre d'exécution
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 1. Rate limiting
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 2. Authentification JWT
    },
    {
      provide: APP_GUARD,
      useClass: AbilitiesGuard, // 3. Vérification des permissions CASL
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Applique le middleware Request ID à toutes les routes
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
