import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { registerAndLogin } from '../helpers';

describe('Update Me — PATCH /users/me (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let refreshToken: string;
  let userId: string;

  const userCredentials = {
    email: 'testme@example.com',
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
    authToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;

    const user = await prisma.user.findUnique({
      where: { email: userCredentials.email },
    });
    userId = user!.id;
  });

  describe('name update', () => {
    it('should update firstName and lastName and return updated profile', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Jane', lastName: 'Smith' })
        .expect(200);

      // Assert
      expect(response.body.firstName).toBe('Jane');
      expect(response.body.lastName).toBe('Smith');
      expect(response.body.fullName).toBe('Jane Smith');

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.firstName).toBe('Jane');
      expect(user?.lastName).toBe('Smith');
    });

    it('should update only firstName', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Jane' })
        .expect(200);

      expect(response.body.firstName).toBe('Jane');
      expect(response.body.lastName).toBe('Doe');
    });

    it('should update only lastName', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lastName: 'Smith' })
        .expect(200);

      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Smith');
    });

    it('should return 400 with firstName exceeding 50 characters', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'a'.repeat(51) })
        .expect(400);
    });
  });

  describe('password change', () => {
    it('should change password and return updated profile', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'NewPassword1!',
          currentPassword: userCredentials.password,
        })
        .expect(200);

      // Assert — le profil est retourné
      expect(response.body.email).toBe(userCredentials.email);

      // Le nouveau mot de passe permet de se connecter
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userCredentials.email, password: 'NewPassword1!' })
        .expect(201);
      expect(loginResponse.body.accessToken).toBeDefined();
    });

    it('should revoke all refresh tokens after password change', async () => {
      // Act
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'NewPassword1!',
          currentPassword: userCredentials.password,
        })
        .expect(200);

      // Assert — le refresh token initial ne fonctionne plus
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('should return 400 when currentPassword is wrong', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'NewPassword1!',
          currentPassword: 'WrongPassword1!',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when newPassword is provided without currentPassword', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newPassword: 'NewPassword1!' })
        .expect(400);
    });

    it('should return 400 with a weak newPassword', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newPassword: 'weak',
          currentPassword: userCredentials.password,
        })
        .expect(400);
    });
  });

  describe('email change initiation', () => {
    it('should return 200 with current profile when email change is initiated', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'nouveau@example.com',
          currentPassword: userCredentials.password,
        })
        .expect(200);

      // Assert — l'email dans la réponse est toujours l'ancien (non changé immédiatement)
      expect(response.body.email).toBe(userCredentials.email);
    });

    it('should NOT change email in DB immediately after email change initiation', async () => {
      // Act
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'nouveau@example.com',
          currentPassword: userCredentials.password,
        })
        .expect(200);

      // Assert — l'email en base est toujours l'ancien
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.email).toBe(userCredentials.email);
    });

    it('should return 400 when newEmail is provided without currentPassword', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newEmail: 'nouveau@example.com' })
        .expect(400);
    });

    it('should return 400 when currentPassword is wrong for email change', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'nouveau@example.com',
          currentPassword: 'WrongPassword1!',
        })
        .expect(400);
    });

    it('should return 409 when newEmail is already taken', async () => {
      // Arrange — créer un autre utilisateur avec le nouvel email
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'taken@example.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User',
        termsAccepted: true,
      });

      // Act
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'taken@example.com',
          currentPassword: userCredentials.password,
        })
        .expect(409);
    });
  });

  describe('authentication', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).patch('/users/me').send({ firstName: 'Jane' }).expect(401);
    });

    it('should return 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .send({ firstName: 'Jane' })
        .expect(401);
    });
  });
});
