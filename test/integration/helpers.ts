import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Signe un JWT avec le secret configuré dans l'application.
 * Nécessaire car JwtModule est importé sans `registerAsync` dans certains modules,
 * ce qui fait que `app.get(JwtService)` peut retourner une instance sans secret par défaut.
 */
export function signToken(app: INestApplication, payload: { sub: string; email: string }): string {
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const secret = configService.get<string>('jwt.secret');
  return jwtService.sign(payload, { secret });
}
