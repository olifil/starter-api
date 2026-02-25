import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Role, NotificationChannel } from '@prisma/client';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { signToken } from '../helpers';

describe('Notification Preferences (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userId: string;
  let userToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    // jwtService removed — using signToken() helper
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.notificationPreference.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Créer un utilisateur
    const user = await prisma.user.create({
      data: {
        email: 'prefs@test.com',
        passwordHash: 'hash',
        firstName: 'Prefs',
        lastName: 'Test',
        role: Role.AUTHENTICATED_USER,
      },
    });
    userId = user.id;
    userToken = await signToken(app, { sub: user.id, email: user.email });

    // Créer un autre utilisateur
    const otherUser = await prisma.user.create({
      data: {
        email: 'other@test.com',
        passwordHash: 'hash',
        firstName: 'Other',
        lastName: 'User',
        role: Role.AUTHENTICATED_USER,
      },
    });
    otherUserToken = await signToken(app, { sub: otherUser.id, email: otherUser.email });
  });

  describe('GET /notifications/preferences', () => {
    it('should return empty array when no preferences are set', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('should return preferences after they have been set', async () => {
      // Créer des préférences directement en base
      await prisma.notificationPreference.create({
        data: {
          userId,
          channel: NotificationChannel.EMAIL,
          enabled: true,
        },
      });
      await prisma.notificationPreference.create({
        data: {
          userId,
          channel: NotificationChannel.WEBSOCKET,
          enabled: false,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            channel: NotificationChannel.EMAIL,
            enabled: true,
          }),
          expect.objectContaining({
            channel: NotificationChannel.WEBSOCKET,
            enabled: false,
          }),
        ]),
      );
    });

    it('should only return preferences for the authenticated user', async () => {
      // Créer une préférence pour l'utilisateur
      await prisma.notificationPreference.create({
        data: {
          userId,
          channel: NotificationChannel.EMAIL,
          enabled: true,
        },
      });

      // L'autre utilisateur ne devrait pas voir ces préférences
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/notifications/preferences').expect(401);
    });
  });

  describe('PUT /notifications/preferences', () => {
    it('should create preferences when none exist', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          preferences: [
            { channel: NotificationChannel.EMAIL, enabled: true },
            { channel: NotificationChannel.WEBSOCKET, enabled: false },
          ],
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);

      // Vérifier en base
      const prefs = await prisma.notificationPreference.findMany({
        where: { userId },
      });
      expect(prefs.length).toBe(2);
    });

    it('should update existing preferences', async () => {
      // Créer une préférence initiale
      await prisma.notificationPreference.create({
        data: {
          userId,
          channel: NotificationChannel.EMAIL,
          enabled: true,
        },
      });

      // Mettre à jour
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          preferences: [{ channel: NotificationChannel.EMAIL, enabled: false }],
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            channel: NotificationChannel.EMAIL,
            enabled: false,
          }),
        ]),
      );

      // Vérifier en base
      const pref = await prisma.notificationPreference.findFirst({
        where: { userId, channel: NotificationChannel.EMAIL },
      });
      expect(pref!.enabled).toBe(false);
    });

    it('should return 400 with invalid channel', async () => {
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          preferences: [{ channel: 'INVALID_CHANNEL', enabled: true }],
        })
        .expect(400);
    });

    it('should return 400 with missing enabled field', async () => {
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          preferences: [{ channel: NotificationChannel.EMAIL }],
        })
        .expect(400);
    });

    it('should return 400 with invalid body structure', async () => {
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ invalid: 'data' })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .send({
          preferences: [{ channel: NotificationChannel.EMAIL, enabled: true }],
        })
        .expect(401);
    });
  });
});
