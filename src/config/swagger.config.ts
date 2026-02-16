import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Starter API')
    .setDescription(
      'API REST starter pack avec authentification, RBAC et infrastructure production-ready',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Entrez votre token JWT',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Authentication', "Endpoints d'authentification (login, register, tokens)")
    .addTag('Users', 'Gestion des utilisateurs (CRUD, profils)')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Documentation disponible à la racine
  SwaggerModule.setup('/', app, document, {
    customSiteTitle: 'Starter API - Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
