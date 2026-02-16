import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import {
  ITemplateRenderer,
  RenderedContent,
} from '../../core/application/services/template-renderer.service';
import { NotificationChannel } from '../../core/domain/value-objects/notification-channel.vo';
import { registerHandlebarsHelpers } from './helpers/handlebars-helpers';

@Injectable()
export class HandlebarsRendererAdapter implements ITemplateRenderer, OnModuleInit {
  private readonly logger = new Logger(HandlebarsRendererAdapter.name);
  private layoutTemplate: Handlebars.TemplateDelegate | null = null;

  constructor(private readonly i18n: I18nService) {}

  onModuleInit(): void {
    registerHandlebarsHelpers();
    this.loadPartials();
    this.loadLayout();
    this.logger.log('Handlebars templates loaded successfully');
  }

  render(
    type: string,
    channel: NotificationChannel,
    locale: string,
    variables: Record<string, unknown>,
  ): RenderedContent {
    const appName = (variables['appName'] as string) || 'Starter API';
    const year = new Date().getFullYear();

    const enrichedVars = {
      ...variables,
      appName,
      year,
      lang: locale,
    };

    const subject = this.translateField(type, 'subject', locale, enrichedVars);
    const channelKey = this.getChannelKey(channel);
    const bodyText = this.translateField(type, channelKey, locale, enrichedVars);

    if (channel === 'EMAIL' && this.layoutTemplate) {
      const layoutArgs = { appName, year: String(year) };
      const body = this.layoutTemplate({
        ...enrichedVars,
        subject,
        content: bodyText,
        layoutHeaderTitle: String(
          this.i18n.t('notification.layout.header.title', { lang: locale, args: layoutArgs }),
        ),
        layoutFooterRights: String(
          this.i18n.t('notification.layout.footer.rights', { lang: locale, args: layoutArgs }),
        ),
        layoutFooterDisclaimer: String(
          this.i18n.t('notification.layout.footer.disclaimer', { lang: locale, args: layoutArgs }),
        ),
      });
      return { subject, body };
    }

    return { subject, body: bodyText };
  }

  private translateField(
    type: string,
    field: string,
    locale: string,
    variables: Record<string, unknown>,
  ): string {
    const key = `notification.${type}.${field}`;
    const translated = String(this.i18n.t(key, { lang: locale, args: variables }));

    // Si la traduction contient des expressions Handlebars, les compiler
    if (translated.includes('{{')) {
      const template = Handlebars.compile(translated);
      return template(variables);
    }

    return translated;
  }

  private getChannelKey(channel: NotificationChannel): string {
    switch (channel) {
      case 'EMAIL':
        return 'body';
      case 'SMS':
        return 'sms';
      case 'PUSH':
      case 'WEB_PUSH':
        return 'push';
      case 'WEBSOCKET':
        return 'body';
      default:
        return 'body';
    }
  }

  private loadLayout(): void {
    const layoutPath = path.join(
      process.cwd(),
      'src',
      'modules',
      'notification',
      'resources',
      'templates',
      'email',
      'layouts',
      'default.hbs',
    );

    if (fs.existsSync(layoutPath)) {
      const layoutSource = fs.readFileSync(layoutPath, 'utf-8');
      this.layoutTemplate = Handlebars.compile(layoutSource);
      this.logger.debug('Email layout loaded');
    } else {
      this.logger.warn(`Email layout not found at ${layoutPath}`);
    }
  }

  private loadPartials(): void {
    const partialsDir = path.join(
      process.cwd(),
      'src',
      'modules',
      'notification',
      'resources',
      'templates',
      'email',
      'partials',
    );

    if (!fs.existsSync(partialsDir)) {
      this.logger.warn(`Partials directory not found at ${partialsDir}`);
      return;
    }

    const files = fs.readdirSync(partialsDir).filter((f) => f.endsWith('.hbs'));
    for (const file of files) {
      const name = path.basename(file, '.hbs');
      const source = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
      Handlebars.registerPartial(name, source);
      this.logger.debug(`Partial '${name}' registered`);
    }
  }
}
