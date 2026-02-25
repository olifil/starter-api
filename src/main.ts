import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Graceful shutdown - Ferme proprement les connexions lors de l'arrêt
  app.enableShutdownHooks();

  // Configuration globale
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Exception filter global
  app.useGlobalFilters(new DomainExceptionFilter());

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non définies dans les DTOs
      forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés non autorisées
      transform: true, // Transforme automatiquement les payloads en instances de DTO
      transformOptions: {
        enableImplicitConversion: true, // Conversion automatique des types
      },
    }),
  );

  // CORS
  const enableCors = configService.get<boolean>('app.enableCors', false);
  if (enableCors) {
    const allowedOrigins = configService.get<string[]>('app.allowedOrigins', [
      'http://localhost:3000',
    ]);
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
  }

  // Configuration Swagger
  setupSwagger(app);

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}`);
  logger.log(`🔗 API endpoints: http://localhost:${port}/${apiPrefix}`);

  return app;
}

bootstrap().then((app) => {
  const logger = new Logger('Shutdown');

  // Gestion des signaux pour un arrêt propre
  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received. Closing application gracefully...`);
    await app.close();
    logger.log('Application closed successfully');
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
});
