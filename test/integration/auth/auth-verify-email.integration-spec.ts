import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';

describe('Auth Verify Email (Integration)', () => {
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

  const registerUser = async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'verify@example.com',
      password: 'Password123!',
      firstName: 'Verify',
      lastName: 'Test',
    });
    return prisma.user.findUnique({ where: { email: 'verify@example.com' } });
  };

  const generateVerificationToken = (
    userId: string,
    email: string,
    options?: { expiresIn?: string },
  ) => {
    const verificationSecret =
      configService.get<string>('jwt.verificationSecret') ??
      configService.get<string>('jwt.secret')!;
    return jwtService.sign(
      { sub: userId, email, type: 'email-verification' },
      { secret: verificationSecret, expiresIn: options?.expiresIn ?? '7d' },
    );
  };

  describe('POST /auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const user = await registerUser();
      const token = generateVerificationToken(user!.id, user!.email);

      await request(app.getHttpServer()).post('/auth/verify-email').send({ token }).expect(204);

      // Vérifier en base que l'email est marqué comme vérifié
      const updatedUser = await prisma.user.findUnique({
        where: { id: user!.id },
      });
      expect(updatedUser!.emailVerified).toBe(true);
      expect(updatedUser!.emailVerifiedAt).not.toBeNull();
    });

    it('should verify user is not verified before token verification', async () => {
      const user = await registerUser();

      // Avant vérification, emailVerified doit être false
      expect(user!.emailVerified).toBe(false);
      expect(user!.emailVerifiedAt).toBeNull();
    });

    it('should reject an invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token-string' });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject an expired token', async () => {
      const user = await registerUser();
      const expiredToken = generateVerificationToken(user!.id, user!.email, {
        expiresIn: '-1h',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: expiredToken });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject a token with wrong type', async () => {
      const user = await registerUser();
      const verificationSecret =
        configService.get<string>('jwt.verificationSecret') ??
        configService.get<string>('jwt.secret')!;
      const wrongTypeToken = jwtService.sign(
        { sub: user!.id, email: user!.email, type: 'wrong-type' },
        { secret: verificationSecret, expiresIn: '7d' },
      );

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: wrongTypeToken });

      expect([400, 401]).toContain(response.status);
    });

    it('should reject token for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const token = generateVerificationToken(fakeUserId, 'fake@example.com');

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token });

      expect([400, 401]).toContain(response.status);
    });

    it('should return 400 with missing token', async () => {
      await request(app.getHttpServer()).post('/auth/verify-email').send({}).expect(400);
    });
  });
});
