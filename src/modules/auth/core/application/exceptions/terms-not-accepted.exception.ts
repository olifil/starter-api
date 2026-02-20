export class TermsNotAcceptedException extends Error {
  constructor() {
    super("L'acceptation des conditions générales d'utilisation est obligatoire");
    this.name = 'TermsNotAcceptedException';
  }
}
