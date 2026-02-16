export class EmailAlreadyExistsException extends Error {
  constructor(email: string) {
    super(`Un compte existe déjà avec l'email: ${email}`);
    this.name = 'EmailAlreadyExistsException';
  }
}
