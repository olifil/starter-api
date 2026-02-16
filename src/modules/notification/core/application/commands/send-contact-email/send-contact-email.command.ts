export class SendContactEmailCommand {
  constructor(
    public readonly senderName: string,
    public readonly senderEmail: string,
    public readonly subject: string,
    public readonly body: string,
  ) {}
}
