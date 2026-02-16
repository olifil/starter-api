export interface RefreshTokenRecord {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface IRefreshTokenRepository {
  save(token: string, userId: string, expiresAt: Date): Promise<void>;
  findByToken(token: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
