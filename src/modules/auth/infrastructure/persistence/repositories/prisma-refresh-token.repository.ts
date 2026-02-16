import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import {
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '../../../core/domain/repositories/refresh-token.repository.interface';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(token: string, userId: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  async findByToken(token: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { token } });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
