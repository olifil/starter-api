export class InvalidVerificationTokenException extends Error {
  constructor() {
    super('Token de vérification invalide ou expiré');
    this.name = 'InvalidVerificationTokenException';
  }
}
