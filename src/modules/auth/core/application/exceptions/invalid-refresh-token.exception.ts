export class InvalidRefreshTokenException extends Error {
  constructor() {
    super('Refresh token invalide ou expiré');
    this.name = 'InvalidRefreshTokenException';
  }
}
