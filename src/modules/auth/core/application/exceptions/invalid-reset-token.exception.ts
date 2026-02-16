export class InvalidResetTokenException extends Error {
  constructor() {
    super('Token de réinitialisation invalide ou expiré');
    this.name = 'InvalidResetTokenException';
  }
}
