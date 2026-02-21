import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';
import { registerAndLogin } from '../helpers';

describe('Auth (Integration)', () => {
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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.user.deleteMany();
  });

  describe('POST /auth/register', () => {
    it('should register a new user (204 no content)', async () => {
      // Arrange
      const registerDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true,
      };

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(204);

      // Assert — vérifier que l'utilisateur a été créé en base
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      expect(user).toBeDefined();
      expect(user?.firstName).toBe('John');
      expect(user?.lastName).toBe('Doe');
    });

    it('should return 409 when email already exists', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true,
      };

      // Premier enregistrement
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(204);

      // Act - Tentative de réenregistrement avec le même email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      // Assert
      expect(response.body.message).toContain("Un compte existe déjà avec l'email");
    });

    it('should return 400 with invalid email', async () => {
      // Arrange
      const registerDto = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Email invalide');
    });

    it('should return 400 with weak password', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      // Assert
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 with missing required fields', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        // password manquant
      };

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should return 400 when termsAccepted is false', async () => {
      // Arrange
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: false,
      };

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const registerDto = {
        email: 'Test@Example.COM',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        termsAccepted: true,
      };

      // Act
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(204);

      // Assert
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Créer un utilisateur de test et vérifier son email
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'testuser@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      });
      await prisma.user.update({
        where: { email: 'testuser@example.com' },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
    });

    it('should login with valid credentials and return tokens', async () => {
      // Arrange
      const loginDto = {
        email: 'testuser@example.com',
        password: 'Password123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
    });

    it('should return 401 with invalid email', async () => {
      // Arrange
      const loginDto = {
        email: 'unknown@example.com',
        password: 'Password123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      // Assert
      expect(response.body.message).toContain('Email ou mot de passe incorrect');
    });

    it('should return 401 with invalid password', async () => {
      // Arrange
      const loginDto = {
        email: 'testuser@example.com',
        password: 'WrongPassword123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      // Assert
      expect(response.body.message).toContain('Email ou mot de passe incorrect');
    });

    it('should return 400 with invalid email format', async () => {
      // Arrange
      const loginDto = {
        email: 'invalid-email',
        password: 'Password123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Email invalide');
    });

    it('should return 400 with missing password', async () => {
      // Arrange
      const loginDto = {
        email: 'testuser@example.com',
      };

      // Act
      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(400);
    });

    it('should login with case-insensitive email', async () => {
      // Arrange
      const loginDto = {
        email: 'TestUser@Example.COM',
        password: 'Password123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      // Assert
      expect(response.body.accessToken).toBeDefined();
    });
  });

  describe('JWT Authentication', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Créer un utilisateur et récupérer le token via register + login
      const tokens = await registerAndLogin(app, {
        email: 'authuser@example.com',
        password: 'Password123!',
        firstName: 'Auth',
        lastName: 'User',
      });

      accessToken = tokens.accessToken;
    });

    it('should access protected route with valid token', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 401 for protected route without token', async () => {
      // Act
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should return 401 for protected route with invalid token', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
