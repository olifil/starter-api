export class EmailNotVerifiedException extends Error {
  constructor() {
    super(
      "Vous ne pourrez pas vous connecter tant que votre adresse e-mail n'aura pas été vérifiée.",
    );
    this.name = 'EmailNotVerifiedException';
  }
}
