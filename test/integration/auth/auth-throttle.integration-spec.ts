import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { DomainExceptionFilter } from '../../../src/shared/filters/domain-exception.filter';

/**
 * Tests d'intégration — Rate Limiting (ThrottlerModule)
 *
 * On override THROTTLER:MODULE_OPTIONS pour fixer la limite strict à 2,
 * ce qui permet de déclencher le 429 avec seulement 3 requêtes.
 * Aucune modification des variables d'environnement n'est nécessaire.
 *
 * Le stockage est en mémoire et isolé par instance d'application.
 * Chaque route a son propre compteur (keyed par IP + throttler + handler).
 */
describe('Auth Rate Limiting (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const LOGIN_DTO = { email: 'throttle@example.com', password: 'Password123!' };
  const REGISTER_DTO = {
    email: 'throttle-register@example.com',
    password: 'Password123!',
    firstName: 'Throttle',
    lastName: 'Test',
    termsAccepted: true,
  };
  const FORGOT_PASSWORD_DTO = { email: 'throttle@example.com' };

  const STRICT_LIMIT = 2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('THROTTLER:MODULE_OPTIONS')
      .useValue([
        { name: 'default', ttl: 60_000, limit: 1_000 },
        { name: 'strict', ttl: 60_000, limit: STRICT_LIMIT },
      ])
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { email: REGISTER_DTO.email } });
    } catch {
      // La table peut ne pas exister si les migrations n'ont pas été appliquées
    }
    await prisma.$disconnect();
    await app.close();
  });

  // ─── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login — strict throttler', () => {
    it('should allow the first 2 requests (even if credentials are invalid)', async () => {
      // Arrange & Act
      const r1 = await request(app.getHttpServer()).post('/auth/login').send(LOGIN_DTO);
      const r2 = await request(app.getHttpServer()).post('/auth/login').send(LOGIN_DTO);

      // Assert — pas 429 (le code exact dépend de l'état de la DB)
      expect(r1.status).not.toBe(429);
      expect(r2.status).not.toBe(429);
    });

    it('should return 429 on the 3rd request (limit exceeded)', async () => {
      // Le compteur est déjà à 2 depuis le test précédent
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(LOGIN_DTO)
        .expect(429);

      // ThrottlerException.getResponse() renvoie une chaîne, pas un objet
      expect(response.body).toContain('ThrottlerException');
    });

    it('should include a Retry-After-strict header on throttled responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(LOGIN_DTO)
        .expect(429);

      // Le suffixe '-strict' est ajouté car le throttler s'appelle 'strict'
      expect(response.headers['retry-after-strict']).toBeDefined();
      expect(Number(response.headers['retry-after-strict'])).toBeGreaterThan(0);
    });
  });

  // ─── POST /auth/register ────────────────────────────────────────────────────

  describe('POST /auth/register — strict throttler', () => {
    it('should allow the first 2 requests', async () => {
      // r1 → 204 (utilisateur créé)
      // r2 → 409 (email déjà utilisé), mais pas encore throttlé
      const r1 = await request(app.getHttpServer()).post('/auth/register').send(REGISTER_DTO);
      const r2 = await request(app.getHttpServer()).post('/auth/register').send(REGISTER_DTO);

      expect(r1.status).not.toBe(429);
      expect(r2.status).not.toBe(429);
    });

    it('should return 429 on the 3rd request (limit exceeded)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(REGISTER_DTO)
        .expect(429);

      expect(response.body).toContain('ThrottlerException');
    });
  });

  // ─── POST /auth/forgot-password ─────────────────────────────────────────────

  describe('POST /auth/forgot-password — strict throttler', () => {
    it('should allow the first 2 requests', async () => {
      const r1 = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(FORGOT_PASSWORD_DTO);
      const r2 = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(FORGOT_PASSWORD_DTO);

      // 204 attendu (même si l'utilisateur n'existe pas — réponse silencieuse)
      expect(r1.status).not.toBe(429);
      expect(r2.status).not.toBe(429);
    });

    it('should return 429 on the 3rd request (limit exceeded)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(FORGOT_PASSWORD_DTO)
        .expect(429);

      expect(response.body).toContain('ThrottlerException');
    });
  });

  // ─── POST /auth/refresh — PAS de throttler strict ───────────────────────────

  describe('POST /auth/refresh — default throttler only', () => {
    it('should NOT apply strict throttling (3 requests all pass, not 429)', async () => {
      const dto = { refreshToken: 'invalid-token' };

      // Envoyer STRICT_LIMIT + 1 = 3 requêtes → aucune ne doit être 429
      const r1 = await request(app.getHttpServer()).post('/auth/refresh').send(dto);
      const r2 = await request(app.getHttpServer()).post('/auth/refresh').send(dto);
      const r3 = await request(app.getHttpServer()).post('/auth/refresh').send(dto);

      // Toutes doivent être 401 (refresh token invalide), jamais 429
      expect(r1.status).not.toBe(429);
      expect(r2.status).not.toBe(429);
      expect(r3.status).not.toBe(429);
    });
  });
});
