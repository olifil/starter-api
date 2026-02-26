export class InvalidCurrentPasswordException extends Error {
  constructor() {
    super('Mot de passe actuel incorrect');
    this.name = 'InvalidCurrentPasswordException';
  }
}
