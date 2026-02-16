import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { Role } from '@prisma/client';
import { signToken } from '../helpers';

describe('User Pagination (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

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
  });

  describe('GET /users', () => {
    beforeEach(async () => {
      // Create an admin user for testing admin-only endpoint
      const admin = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          passwordHash: 'hash',
          firstName: 'Admin',
          lastName: 'Test',
          role: Role.ADMIN,
        },
      });
      adminToken = signToken(app, {
        sub: admin.id,
        email: admin.email,
      });
    });

    it('should return paginated users with default pagination', async () => {
      // Create 15 test users
      const userPromises = Array.from({ length: 15 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `user${i}@example.com`,
            passwordHash: 'hashed',
            firstName: `User${i}`,
            lastName: `Test${i}`,
          },
        }),
      );
      await Promise.all(userPromises);

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.meta).toEqual({
        currentPage: 1,
        pageSize: 10,
        totalItems: 16, // 15 created + 1 admin user
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should return paginated users with custom page and pageSize', async () => {
      // Create 25 test users
      const userPromises = Array.from({ length: 25 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `user${i}@example.com`,
            passwordHash: 'hashed',
            firstName: `User${i}`,
            lastName: `Test${i}`,
          },
        }),
      );
      await Promise.all(userPromises);

      const response = await request(app.getHttpServer())
        .get('/users?page=2&pageSize=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta).toEqual({
        currentPage: 2,
        pageSize: 5,
        totalItems: 26, // 25 created + 1 admin user
        totalPages: 6,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should return empty array when page is beyond total pages', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?page=10&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.currentPage).toBe(10);
      expect(response.body.meta.totalItems).toBe(1); // Only admin user
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should order users by creation date descending', async () => {
      // Create users with different creation times (in the future to be newer than test user)
      await prisma.user.create({
        data: {
          email: 'oldest@example.com',
          passwordHash: 'hashed',
          firstName: 'Oldest',
          lastName: 'User',
          createdAt: new Date('2025-01-01'),
        },
      });

      await prisma.user.create({
        data: {
          email: 'newest@example.com',
          passwordHash: 'hashed',
          firstName: 'Newest',
          lastName: 'User',
          createdAt: new Date('2027-12-31'),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // First user should be the newest one
      expect(response.body.data[0].email).toBe('newest@example.com');
    });

    it('should return correct user profile data structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('firstName');
      expect(response.body.data[0]).toHaveProperty('lastName');
      expect(response.body.data[0]).toHaveProperty('fullName');
      expect(response.body.data[0]).toHaveProperty('createdAt');
      expect(response.body.data[0]).toHaveProperty('updatedAt');
      expect(response.body.data[0]).not.toHaveProperty('password');
      expect(response.body.data[0]).not.toHaveProperty('passwordHash');
    });
  });
});
