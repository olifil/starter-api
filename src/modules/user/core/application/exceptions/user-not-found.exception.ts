export class UserNotFoundException extends Error {
  constructor(identifier: string) {
    super(`Utilisateur non trouvé: ${identifier}`);
    this.name = 'UserNotFoundException';
  }
}
