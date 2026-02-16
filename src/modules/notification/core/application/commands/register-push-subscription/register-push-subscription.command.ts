export class RegisterPushSubscriptionCommand {
  constructor(
    public readonly userId: string,
    public readonly endpoint: string,
    public readonly p256dh: string,
    public readonly auth: string,
  ) {}
}
