import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/database/prisma.service';
import request from 'supertest';

/**
 * Signe un JWT avec le secret configuré dans l'application.
 * Nécessaire car JwtModule est importé sans `registerAsync` dans certains modules,
 * ce qui fait que `app.get(JwtService)` peut retourner une instance sans secret par défaut.
 */
export async function signToken(
  app: INestApplication,
  payload: { sub: string; email: string },
): Promise<string> {
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const secret = configService.get<string>('jwt.secret');
  return jwtService.signAsync(payload, { secret });
}

/**
 * Inscrit un utilisateur (POST /auth/register → 204), vérifie son email directement
 * en base (contournement du flux email pour les tests), puis se connecte (POST /auth/login → 201)
 * et retourne les tokens JWT (accessToken, refreshToken, expiresIn).
 */
export async function registerAndLogin(
  app: INestApplication,
  dto: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  },
): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName ?? 'Test',
      lastName: dto.lastName ?? 'User',
      termsAccepted: true,
    });

  // Vérifier l'email directement en base pour contourner le flux email dans les tests
  const prisma = app.get(PrismaService);
  await prisma.user.update({
    where: { email: dto.email.toLowerCase() },
    data: { emailVerified: true, emailVerifiedAt: new Date() },
  });

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: dto.email, password: dto.password });

  return loginResponse.body as { accessToken: string; refreshToken: string; expiresIn: string };
}
