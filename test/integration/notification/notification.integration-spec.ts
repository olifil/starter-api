import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Role, NotificationChannel, NotificationStatus } from '@prisma/client';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { signToken } from '../helpers';

describe('Notification (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userId: string;
  let userToken: string;
  let adminToken: string;
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

    // Créer un utilisateur régulier
    const user = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: 'hash',
        firstName: 'User',
        lastName: 'Test',
        role: Role.AUTHENTICATED_USER,
      },
    });
    userId = user.id;
    userToken = await signToken(app, { sub: user.id, email: user.email });

    // Créer un admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: 'hash',
        firstName: 'Admin',
        lastName: 'Test',
        role: Role.ADMIN,
      },
    });
    adminToken = await signToken(app, { sub: admin.id, email: admin.email });

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

  describe('POST /notifications/send', () => {
    it('should allow admin to send a notification', async () => {
      const response = await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [userId],
          type: 'welcome',
          channels: [NotificationChannel.WEBSOCKET],
          variables: { firstName: 'User' },
          locale: 'fr',
        })
        .expect(201);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('type', 'welcome');
      expect(response.body[0]).toHaveProperty('channel', NotificationChannel.WEBSOCKET);

      // Vérifier en base
      const notifications = await prisma.notification.findMany({
        where: { userId },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should return 403 for regular user', async () => {
      await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userIds: [userId],
          type: 'welcome',
          channels: [NotificationChannel.WEBSOCKET],
        })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/notifications/send')
        .send({
          userIds: [userId],
          type: 'welcome',
          channels: [NotificationChannel.WEBSOCKET],
        })
        .expect(401);
    });

    it('should return 400 with invalid channel', async () => {
      await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [userId],
          type: 'welcome',
          channels: ['INVALID_CHANNEL'],
        })
        .expect(400);
    });

    it('should return 400 with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /notifications', () => {
    beforeEach(async () => {
      // Créer des notifications pour l'utilisateur
      const notifications = Array.from({ length: 5 }, (_, i) => ({
        userId,
        type: 'test-notification',
        channel: NotificationChannel.WEBSOCKET,
        status: i < 3 ? NotificationStatus.SENT : NotificationStatus.READ,
        body: `Notification ${i}`,
        subject: `Subject ${i}`,
        sentAt: i < 3 ? new Date() : undefined,
        readAt: i >= 3 ? new Date() : undefined,
      }));

      for (const notification of notifications) {
        await prisma.notification.create({ data: notification });
      }
    });

    it('should return paginated notifications for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(5);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?page=1&pageSize=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.meta.totalItems).toBe(5);
      expect(response.body.meta.hasNextPage).toBe(true);
    });

    it('should only return notifications for the authenticated user', async () => {
      // L'autre utilisateur ne devrait pas voir ces notifications
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });

  describe('GET /notifications — Filtres', () => {
    beforeEach(async () => {
      // 3 notifications welcome/EMAIL/SENT
      for (let i = 0; i < 3; i++) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'welcome',
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.SENT,
            body: `Welcome ${i}`,
            subject: `Welcome subject ${i}`,
            sentAt: new Date(),
          },
        });
      }
      // 2 notifications generic/WEBSOCKET/READ
      for (let i = 0; i < 2; i++) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'generic',
            channel: NotificationChannel.WEBSOCKET,
            status: NotificationStatus.READ,
            body: `Generic ${i}`,
            readAt: new Date(),
          },
        });
      }
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?type=welcome')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.meta.totalItems).toBe(3);
      expect(response.body.data.every((n: { type: string }) => n.type === 'welcome')).toBe(true);
    });

    it('should filter by channel', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?channel=WEBSOCKET')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.meta.totalItems).toBe(2);
      expect(response.body.data.every((n: { channel: string }) => n.channel === 'WEBSOCKET')).toBe(
        true,
      );
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?status=SENT')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.meta.totalItems).toBe(3);
      expect(response.body.data.every((n: { status: string }) => n.status === 'SENT')).toBe(true);
    });

    it('should apply all filters combined', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?type=welcome&channel=EMAIL&status=SENT')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.meta.totalItems).toBe(3);
    });

    it('should return empty result when no notifications match filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?type=welcome&channel=WEBSOCKET')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.meta.totalItems).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 400 for invalid channel', async () => {
      await request(app.getHttpServer())
        .get('/notifications?channel=INVALID_CHANNEL')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should return 400 for invalid status', async () => {
      await request(app.getHttpServer())
        .get('/notifications?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should return 400 for invalid type format', async () => {
      await request(app.getHttpServer())
        .get('/notifications?type=INVALID TYPE!')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should only return filtered notifications for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?type=welcome')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.meta.totalItems).toBe(0);
    });
  });

  describe('GET /notifications/unread-count', () => {
    beforeEach(async () => {
      // 3 notifications WEBSOCKET/SENT
      for (let i = 0; i < 3; i++) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'test-notification',
            channel: NotificationChannel.WEBSOCKET,
            status: NotificationStatus.SENT,
            body: `Unread WS ${i}`,
            sentAt: new Date(),
          },
        });
      }
      // 2 notifications EMAIL/SENT
      for (let i = 0; i < 2; i++) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'test-notification',
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.SENT,
            body: `Unread EMAIL ${i}`,
            sentAt: new Date(),
          },
        });
      }
      // 2 notifications WEBSOCKET/READ
      for (let i = 0; i < 2; i++) {
        await prisma.notification.create({
          data: {
            userId,
            type: 'test-notification',
            channel: NotificationChannel.WEBSOCKET,
            status: NotificationStatus.READ,
            body: `Read ${i}`,
            readAt: new Date(),
          },
        });
      }
    });

    it('should return unread count (SENT) for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 5);
    });

    it('should filter by channel', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count?channel=WEBSOCKET')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 3);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count?status=READ')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 2);
    });

    it('should filter by channel and status combined', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count?channel=EMAIL&status=SENT')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 2);
    });

    it('should return 0 for user with no notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 0);
    });

    it('should return 400 for invalid channel', async () => {
      await request(app.getHttpServer())
        .get('/notifications/unread-count?channel=INVALID')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should return 400 for invalid status', async () => {
      await request(app.getHttpServer())
        .get('/notifications/unread-count?status=INVALID')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/notifications/unread-count').expect(401);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'test-notification',
          channel: NotificationChannel.WEBSOCKET,
          status: NotificationStatus.SENT,
          body: 'To be read',
          sentAt: new Date(),
        },
      });
      notificationId = notification.id;
    });

    it('should mark notification as read', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', notificationId);

      // Vérifier en base
      const updated = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      expect(updated!.status).toBe(NotificationStatus.READ);
      expect(updated!.readAt).not.toBeNull();
    });

    it('should return 404 when notification belongs to another user', async () => {
      await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .patch(`/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).patch(`/notifications/${notificationId}/read`).expect(401);
    });
  });
});
