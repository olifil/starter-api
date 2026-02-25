import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';

describe('Auth Refresh Token (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.user.deleteMany();
  });

  const registerUser = async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'refresh@example.com',
      password: 'Password123!',
      firstName: 'Refresh',
      lastName: 'Test',
      termsAccepted: true,
    });
    // Vérifier l'email pour permettre le login dans les tests
    await prisma.user.update({
      where: { email: 'refresh@example.com' },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'refresh@example.com', password: 'Password123!' });
    return loginResponse.body as { accessToken: string; refreshToken: string; expiresIn: string };
  };

  describe('POST /auth/refresh', () => {
    it('should return new tokens with a valid refresh token', async () => {
      const { refreshToken } = await registerUser();

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      // Le nouveau refresh token doit être différent de l'ancien
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('should revoke the old refresh token after rotation', async () => {
      const { refreshToken } = await registerUser();

      // Premier refresh — doit réussir
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(201);

      // Réutiliser l'ancien refresh token — doit échouer
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      expect([400, 401]).toContain(response.status);
    });

    it('should return a working access token after refresh', async () => {
      const { refreshToken } = await registerUser();

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      // Utiliser le nouveau access token pour accéder à une route protégée
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);
    });

    it('should reject an invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token-string' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject an expired refresh token', async () => {
      // Enregistrer un utilisateur pour créer un token valide
      await registerUser();

      // Créer un token expiré manuellement
      const { JwtService } = await import('@nestjs/jwt');
      const { ConfigService } = await import('@nestjs/config');
      const jwtService = app.get(JwtService);
      const configService = app.get(ConfigService);

      const user = await prisma.user.findUnique({
        where: { email: 'refresh@example.com' },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const expiredToken = await jwtService.signAsync(
        { sub: user!.id, email: user!.email },
        {
          secret: configService.get<string>('jwt.refreshSecret'),
          expiresIn: '-1h' as any,
        },
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 400 with missing refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
    });

    it('should allow chained refresh token rotation', async () => {
      const { refreshToken: firstToken } = await registerUser();

      // Premier refresh
      const firstRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: firstToken })
        .expect(201);

      // Deuxième refresh avec le nouveau token
      const secondRefresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: firstRefresh.body.refreshToken })
        .expect(201);

      expect(secondRefresh.body.accessToken).toBeDefined();
      expect(secondRefresh.body.refreshToken).not.toBe(firstRefresh.body.refreshToken);
    });
  });
});
