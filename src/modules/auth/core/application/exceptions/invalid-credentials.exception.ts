export class InvalidCredentialsException extends Error {
  constructor() {
    super('Email ou mot de passe incorrect');
    this.name = 'InvalidCredentialsException';
  }
}
