import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InvalidVerificationTokenException } from '../exceptions/invalid-verification-token.exception';
import { InvalidResetTokenException } from '../exceptions/invalid-reset-token.exception';

interface VerificationTokenPayload {
  sub: string;
  email: string;
  type: 'email-verification';
}

interface EmailChangeTokenPayload {
  sub: string;
  newEmail: string;
  type: 'email-change';
}

export type EmailTokenResult =
  | { type: 'email-verification'; sub: string; email: string }
  | { type: 'email-change'; sub: string; newEmail: string };

@Injectable()
export class EmailTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateVerificationToken(userId: string, email: string): Promise<string> {
    const secret =
      this.configService.get<string>('jwt.verificationSecret') ??
      this.configService.get<string>('jwt.secret')!;
    const expiresIn = this.configService.get<string>('jwt.verificationExpiresIn', '7d');

    return this.jwtService.signAsync(
      { sub: userId, email, type: 'email-verification' } satisfies VerificationTokenPayload,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { secret, expiresIn: expiresIn as any },
    );
  }

  async generateEmailChangeToken(
    userId: string,
    newEmail: string,
  ): Promise<{ token: string; expiresIn: string }> {
    const secret =
      this.configService.get<string>('jwt.emailChangeSecret') ??
      this.configService.get<string>('jwt.secret')!;
    const expiresIn = this.configService.get<string>('jwt.emailChangeExpiresIn', '1h');

    const token = await this.jwtService.signAsync(
      { sub: userId, newEmail, type: 'email-change' } satisfies EmailChangeTokenPayload,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { secret, expiresIn: expiresIn as any },
    );

    return { token, expiresIn };
  }

  /**
   * Vérifie un token d'email sans connaissance préalable du type.
   * Décode d'abord le type du payload, puis vérifie avec le bon secret.
   */
  async verifyEmailToken(token: string): Promise<EmailTokenResult> {
    const decoded: { type?: string } | null = this.jwtService.decode(token);

    if (decoded?.type === 'email-verification') {
      const payload = await this.verifyVerificationToken(token);
      return { type: 'email-verification', ...payload };
    }

    if (decoded?.type === 'email-change') {
      const payload = await this.verifyEmailChangeToken(token);
      return { type: 'email-change', ...payload };
    }

    throw new InvalidVerificationTokenException();
  }

  async verifyVerificationToken(token: string): Promise<{ sub: string; email: string }> {
    const secret =
      this.configService.get<string>('jwt.verificationSecret') ??
      this.configService.get<string>('jwt.secret')!;

    try {
      const payload = await this.jwtService.verifyAsync<VerificationTokenPayload>(token, {
        secret,
      });

      if (payload.type !== 'email-verification') {
        throw new InvalidVerificationTokenException();
      }

      return { sub: payload.sub, email: payload.email };
    } catch (err) {
      if (err instanceof InvalidVerificationTokenException) throw err;
      throw new InvalidVerificationTokenException();
    }
  }

  async verifyEmailChangeToken(token: string): Promise<{ sub: string; newEmail: string }> {
    const secret =
      this.configService.get<string>('jwt.emailChangeSecret') ??
      this.configService.get<string>('jwt.secret')!;

    try {
      const payload = await this.jwtService.verifyAsync<EmailChangeTokenPayload>(token, {
        secret,
      });

      if (payload.type !== 'email-change') {
        throw new InvalidResetTokenException();
      }

      return { sub: payload.sub, newEmail: payload.newEmail };
    } catch (err) {
      if (err instanceof InvalidResetTokenException) throw err;
      throw new InvalidResetTokenException();
    }
  }
}
