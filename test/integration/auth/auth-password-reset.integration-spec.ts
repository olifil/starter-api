import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';

describe('Auth Password Reset (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    configService = app.get<ConfigService>(ConfigService);
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

  const registerUser = async (email = 'reset@example.com') => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password: 'Password123!',
      firstName: 'Reset',
      lastName: 'Test',
      termsAccepted: true,
    });
    // Vérifier l'email pour permettre le login dans les tests
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
  };

  const generateResetToken = async (
    userId: string,
    email: string,
    options?: { expiresIn?: string },
  ) => {
    const resetSecret =
      configService.get<string>('jwt.resetSecret') ?? configService.get<string>('jwt.secret')!;
    return jwtService.signAsync(
      { sub: userId, email, type: 'password-reset' },

      { secret: resetSecret, expiresIn: (options?.expiresIn ?? '15m') as any },
    );
  };

  describe('POST /auth/forgot-password', () => {
    it('should return 204 with existing email', async () => {
      await registerUser();

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'reset@example.com' })
        .expect(204);
    });

    it('should return 204 with unknown email (does not reveal existence)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'unknown@example.com' })
        .expect(204);
    });

    it('should return 400 with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should return 400 with missing email', async () => {
      await request(app.getHttpServer()).post('/auth/forgot-password').send({}).expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token and allow login with new password', async () => {
      await registerUser();
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });
      const resetToken = await generateResetToken(user!.id, user!.email);

      // Reset le mot de passe
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: resetToken, newPassword: 'NewPassword456!' })
        .expect(204);

      // Login avec le nouveau mot de passe
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'reset@example.com', password: 'NewPassword456!' })
        .expect(201);

      expect(loginResponse.body.accessToken).toBeDefined();
    });

    it('should reject login with old password after reset', async () => {
      await registerUser();
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });
      const resetToken = await generateResetToken(user!.id, user!.email);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: resetToken, newPassword: 'NewPassword456!' })
        .expect(204);

      // L'ancien mot de passe ne doit plus fonctionner
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'reset@example.com', password: 'Password123!' })
        .expect(401);
    });

    it('should reject an invalid reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword456!' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject an expired reset token', async () => {
      await registerUser();
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });
      const expiredToken = await generateResetToken(user!.id, user!.email, { expiresIn: '-1h' });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: expiredToken, newPassword: 'NewPassword456!' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject a token with wrong type', async () => {
      await registerUser();
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });

      const resetSecret =
        configService.get<string>('jwt.resetSecret') ?? configService.get<string>('jwt.secret')!;

      const wrongTypeToken = await jwtService.signAsync(
        { sub: user!.id, email: user!.email, type: 'wrong-type' },

        { secret: resetSecret, expiresIn: '15m' as any },
      );

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: wrongTypeToken, newPassword: 'NewPassword456!' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject reset with weak password', async () => {
      await registerUser();
      const user = await prisma.user.findUnique({
        where: { email: 'reset@example.com' },
      });
      const resetToken = await generateResetToken(user!.id, user!.email);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: resetToken, newPassword: 'weak' })
        .expect(400);
    });

    it('should reject reset for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const resetSecret =
        configService.get<string>('jwt.resetSecret') ?? configService.get<string>('jwt.secret')!;

      const fakeToken = await jwtService.signAsync(
        { sub: fakeUserId, email: 'fake@example.com', type: 'password-reset' },

        { secret: resetSecret, expiresIn: '15m' as any },
      );

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: fakeToken, newPassword: 'NewPassword456!' });

      expect([400, 401]).toContain(response.status);
    });
  });
});
