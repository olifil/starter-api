export class ChannelDisabledException extends Error {
  constructor(channel: string) {
    super(`Le canal de notification '${channel}' est désactivé`);
    this.name = 'ChannelDisabledException';
  }
}
