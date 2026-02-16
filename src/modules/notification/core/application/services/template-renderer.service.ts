import { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';

export interface RenderedContent {
  subject?: string;
  body: string;
}

export interface ITemplateRenderer {
  render(
    type: string,
    channel: NotificationChannel,
    locale: string,
    variables: Record<string, unknown>,
  ): RenderedContent;
}

export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');
