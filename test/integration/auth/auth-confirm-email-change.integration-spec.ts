import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { registerAndLogin } from '../helpers';

/**
 * Génère un token JWT de type 'email-change' signé avec le secret resetSecret de l'app.
 */
async function signEmailChangeToken(
  app: INestApplication,
  payload: { sub: string; newEmail: string },
  expiresIn = '1h',
): Promise<string> {
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const secret =
    configService.get<string>('jwt.resetSecret') ?? configService.get<string>('jwt.secret')!;
  return jwtService.signAsync({ ...payload, type: 'email-change' }, { secret, expiresIn });
}

describe('Confirm Email Change — POST /auth/confirm-email-change (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;
  let refreshToken: string;

  const userCredentials = {
    email: 'original@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
  };

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
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();

    const tokens = await registerAndLogin(app, userCredentials);
    refreshToken = tokens.refreshToken;

    const user = await prisma.user.findUnique({
      where: { email: userCredentials.email },
    });
    userId = user!.id;
  });

  describe('successful email change', () => {
    it('should return 204 and update email in database', async () => {
      // Arrange
      const token = await signEmailChangeToken(app, {
        sub: userId,
        newEmail: 'nouveau@example.com',
      });

      // Act
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token })
        .expect(204);

      // Assert — l'email a bien été modifié en base
      const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(updatedUser?.email).toBe('nouveau@example.com');
    });

    it('should revoke all refresh tokens after email change', async () => {
      // Arrange
      const token = await signEmailChangeToken(app, {
        sub: userId,
        newEmail: 'nouveau@example.com',
      });

      // Act
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token })
        .expect(204);

      // Assert — le refresh token précédent ne fonctionne plus
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('should allow login with the new email after confirmation', async () => {
      // Arrange
      const token = await signEmailChangeToken(app, {
        sub: userId,
        newEmail: 'nouveau@example.com',
      });

      // Act
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token })
        .expect(204);

      // Assert — connexion possible avec le nouvel email
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nouveau@example.com', password: userCredentials.password })
        .expect(201);
      expect(loginResponse.body.accessToken).toBeDefined();
    });
  });

  describe('invalid token', () => {
    it('should return 400 with a completely invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: 'not-a-valid-jwt' })
        .expect(400);
    });

    it('should return 400 when token has wrong type', async () => {
      // Arrange — token valide mais mauvais type
      const jwtService = app.get(JwtService);
      const configService = app.get(ConfigService);
      const secret =
        configService.get<string>('jwt.resetSecret') ?? configService.get<string>('jwt.secret')!;
      const wrongTypeToken = await jwtService.signAsync(
        { sub: userId, newEmail: 'nouveau@example.com', type: 'password-reset' },
        { secret, expiresIn: '1h' },
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: wrongTypeToken })
        .expect(400);
    });

    it('should return 400 when token is expired', async () => {
      // Arrange — token expiré immédiatement
      const expiredToken = await signEmailChangeToken(
        app,
        { sub: userId, newEmail: 'nouveau@example.com' },
        '-1s',
      );

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: expiredToken })
        .expect(400);
    });

    it('should return 400 when the user referenced in the token does not exist', async () => {
      // Arrange — token avec un userId inexistant
      const token = await signEmailChangeToken(app, {
        sub: '00000000-0000-0000-0000-000000000000',
        newEmail: 'nouveau@example.com',
      });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token })
        .expect(400);
    });
  });

  describe('email conflict', () => {
    it('should return 409 when new email is already taken at confirmation time', async () => {
      // Arrange — un autre utilisateur prend le nouvel email entre la demande et la confirmation
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'nouveau@example.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User',
        termsAccepted: true,
      });

      const token = await signEmailChangeToken(app, {
        sub: userId,
        newEmail: 'nouveau@example.com',
      });

      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token })
        .expect(409);

      // L'email original reste inchangé
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.email).toBe(userCredentials.email);
    });
  });

  describe('validation', () => {
    it('should return 400 when token field is missing', async () => {
      await request(app.getHttpServer()).post('/auth/confirm-email-change').send({}).expect(400);
    });
  });
});
