import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { Role } from '@prisma/client';
import { signToken, registerAndLogin } from '../helpers';

describe('User Profile (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let adminToken: string;
  let userId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up database before tests
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();

    // Create a test user and authenticate via register + login
    const tokens = await registerAndLogin(app, {
      email: 'testuser@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    });

    authToken = tokens.accessToken;

    // Get user ID from database
    const user = await prisma.user.findUnique({
      where: { email: 'testuser@example.com' },
    });
    userId = user!.id;

    // Create an admin user directly in database for admin operations
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: 'hash',
        firstName: 'Admin',
        lastName: 'Test',
        role: Role.ADMIN,
      },
    });
    adminUserId = admin.id;
    adminToken = signToken(app, {
      sub: admin.id,
      email: admin.email,
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'testuser@example.com');
      expect(response.body).toHaveProperty('firstName', 'John');
      expect(response.body).toHaveProperty('lastName', 'Doe');
      expect(response.body).toHaveProperty('fullName', 'John Doe');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PUT /users/me', () => {
    it('should update current user profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        })
        .expect(200);

      expect(response.body).toHaveProperty('firstName', 'Jane');
      expect(response.body).toHaveProperty('lastName', 'Smith');
      expect(response.body).toHaveProperty('fullName', 'Jane Smith');

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(user?.firstName).toBe('Jane');
      expect(user?.lastName).toBe('Smith');
    });

    it('should update only firstName', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
        })
        .expect(200);

      expect(response.body).toHaveProperty('firstName', 'Jane');
      expect(response.body).toHaveProperty('lastName', 'Doe');
    });

    it('should update only lastName', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lastName: 'Smith',
        })
        .expect(200);

      expect(response.body).toHaveProperty('firstName', 'John');
      expect(response.body).toHaveProperty('lastName', 'Smith');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        })
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'A'.repeat(51), // Too long
        })
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('email', 'testuser@example.com');
      expect(response.body).toHaveProperty('firstName', 'John');
      expect(response.body).toHaveProperty('lastName', 'Doe');
    });

    it('should return 404 for non-existent user (admin)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when regular user tries to access another user', async () => {
      await request(app.getHttpServer())
        .get(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get(`/users/${userId}`).expect(401);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user by id (admin)', async () => {
      // Create another user to delete
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'other@example.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User',
        termsAccepted: true,
      });

      const otherUser = await prisma.user.findUnique({
        where: { email: 'other@example.com' },
      });

      await request(app.getHttpServer())
        .delete(`/users/${otherUser!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      const deletedUser = await prisma.user.findUnique({
        where: { id: otherUser!.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user (admin)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 403 when regular user tries to delete another user', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).delete(`/users/${userId}`).expect(401);
    });
  });
});
