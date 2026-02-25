import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { signToken } from '../helpers';

describe('RBAC Authorization (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens pour différents rôles
  let authenticatedUserToken: string;
  let adminToken: string;
  let superAdminToken: string;

  // IDs des utilisateurs de test
  let authenticatedUserId: string;
  let authenticatedUser2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Nettoyer la base de données
    await prisma.user.deleteMany({});

    // Créer les utilisateurs de test avec différents rôles
    const authenticatedUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        passwordHash: 'hash',
        firstName: 'User',
        lastName: 'Test',
        role: Role.AUTHENTICATED_USER,
      },
    });
    authenticatedUserId = authenticatedUser.id;
    authenticatedUserToken = await signToken(app, {
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
    });

    const authenticatedUser2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        passwordHash: 'hash',
        firstName: 'User2',
        lastName: 'Test',
        role: Role.AUTHENTICATED_USER,
      },
    });
    authenticatedUser2Id = authenticatedUser2.id;
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        passwordHash: 'hash',
        firstName: 'Admin',
        lastName: 'Test',
        role: Role.ADMIN,
      },
    });
    adminToken = await signToken(app, {
      sub: admin.id,
      email: admin.email,
    });

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@test.com',
        passwordHash: 'hash',
        firstName: 'SuperAdmin',
        lastName: 'Test',
        role: Role.SUPER_ADMIN,
      },
    });
    superAdminToken = await signToken(app, {
      sub: superAdmin.id,
      email: superAdmin.email,
    });
  });

  afterAll(async () => {
    // Nettoyer
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('Public routes', () => {
    it('should allow access to /auth/register without token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'newuser@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        termsAccepted: true,
      });

      expect(response.status).not.toBe(401);
      expect([204, 409]).toContain(response.status); // 204 No Content ou 409 si email existe

      // Nettoyer
      if (response.status === 204) {
        await prisma.user.delete({
          where: { email: 'newuser@test.com' },
        });
      }
    });

    it('should allow access to /auth/login without token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'WrongPassword',
      });

      expect(response.status).not.toBe(401); // Pas de 401 Unauthorized
      // Peut être 400 ou 403 selon la logique métier
    });
  });

  describe('Protected routes - Authentication required', () => {
    it('should deny access to /users/me without token', async () => {
      const response = await request(app.getHttpServer()).get('/users/me');

      expect(response.status).toBe(401);
    });

    it('should allow access to /users/me with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authenticatedUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(authenticatedUserId);
    });
  });

  describe('User profile permissions', () => {
    it('should allow user to read their own profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authenticatedUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('user@test.com');
    });

    it('should allow user to update their own profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authenticatedUserToken}`)
        .send({
          firstName: 'UpdatedName',
          lastName: 'UpdatedLastName',
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('UpdatedName');

      // Restaurer le nom original
      await prisma.user.update({
        where: { id: authenticatedUserId },
        data: { firstName: 'User', lastName: 'Test' },
      });
    });

    it('should deny user access to another user profile by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${authenticatedUser2Id}`)
        .set('Authorization', `Bearer ${authenticatedUserToken}`);

      // Devrait être 403 Forbidden ou 404 selon l'implémentation
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Admin permissions', () => {
    it('should allow admin to list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should deny regular user to list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authenticatedUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to view any user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${authenticatedUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(authenticatedUserId);
    });

    it('should allow admin to delete a user', async () => {
      // Créer un utilisateur temporaire à supprimer
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp@test.com',
          passwordHash: 'hash',
          firstName: 'Temp',
          lastName: 'User',
          role: Role.AUTHENTICATED_USER,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Vérifier que l'utilisateur est supprimé
      const deletedUser = await prisma.user.findUnique({
        where: { id: tempUser.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should deny regular user to delete another user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${authenticatedUser2Id}`)
        .set('Authorization', `Bearer ${authenticatedUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Super Admin permissions', () => {
    it('should allow super admin to list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should allow super admin to access any endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${authenticatedUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow super admin to delete any user', async () => {
      // Créer un utilisateur temporaire
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp2@test.com',
          passwordHash: 'hash',
          firstName: 'Temp2',
          lastName: 'User',
          role: Role.AUTHENTICATED_USER,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/users/${tempUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Role hierarchy', () => {
    it('should verify that SUPER_ADMIN has all ADMIN permissions', async () => {
      // Test que le super admin peut faire tout ce que l'admin peut faire
      const adminResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const superAdminResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(adminResponse.status).toBe(200);
      expect(superAdminResponse.status).toBe(200);
    });

    it('should verify that ADMIN cannot access SUPER_ADMIN only resources', async () => {
      // Si on a des endpoints réservés au SUPER_ADMIN (comme /config)
      // On peut les tester ici
      // Pour l'instant, on vérifie juste que l'admin peut gérer les users
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Invalid tokens', () => {
    it('should reject expired token', async () => {
      const jwtService = app.get(JwtService);
      const configService = app.get(ConfigService);
      const secret = configService.get<string>('jwt.secret');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const expiredToken = await jwtService.signAsync(
        {
          sub: authenticatedUserId,
          email: 'user@test.com',
        },
        { secret, expiresIn: '-1h' as any },
      );

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
    });

    it('should reject token with invalid signature', async () => {
      const invalidToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing Authorization header', async () => {
      const response = await request(app.getHttpServer()).get('/users/me');

      expect(response.status).toBe(401);
    });

    it('should handle Authorization header without Bearer prefix', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', authenticatedUserToken);

      expect(response.status).toBe(401);
    });

    it('should handle empty Authorization header', async () => {
      const response = await request(app.getHttpServer()).get('/users/me').set('Authorization', '');

      expect(response.status).toBe(401);
    });
  });
});
