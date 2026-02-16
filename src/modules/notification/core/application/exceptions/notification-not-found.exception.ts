export class NotificationNotFoundException extends Error {
  constructor(id: string) {
    super(`Notification non trouvée: ${id}`);
    this.name = 'NotificationNotFoundException';
  }
}
