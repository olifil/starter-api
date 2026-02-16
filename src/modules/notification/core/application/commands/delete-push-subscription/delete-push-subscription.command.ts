export class DeletePushSubscriptionCommand {
  constructor(
    public readonly userId: string,
    public readonly endpoint: string,
  ) {}
}
