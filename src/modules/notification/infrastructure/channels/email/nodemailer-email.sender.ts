import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  ChannelSenderPort,
  SendNotificationPayload,
} from '../../../core/domain/ports/channel-sender.port';
import { NotificationChannel } from '../../../core/domain/value-objects/notification-channel.vo';

@Injectable()
export class NodemailerEmailSender implements ChannelSenderPort {
  readonly channel: NotificationChannel = 'EMAIL';
  private readonly logger = new Logger(NodemailerEmailSender.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('notification.smtp.enabled', false);
    this.from = this.configService.get<string>('notification.smtp.from', 'noreply@starter.local');

    if (this.enabled) {
      const host = this.configService.get<string>('notification.smtp.host') ?? 'mailhog';
      const port = this.configService.get<number>('notification.smtp.port', 1025);
      const secure = this.configService.get<boolean>('notification.smtp.secure', false);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        ...(secure ? {} : { ignoreTLS: true }),
        auth: this.getAuth(),
      });
      this.logger.log('Email channel initialized (SMTP)');
    } else {
      this.logger.warn('Email channel disabled (SMTP_HOST not configured)');
    }
  }

  async send(payload: SendNotificationPayload): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email channel is not enabled');
    }

    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject || '',
      html: payload.body,
    });

    this.logger.debug(`Email sent to ${payload.to}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  defaultUserPreference(): boolean {
    return this.isEnabled();
  }

  private getAuth(): { user: string; pass: string } | undefined {
    const user = this.configService.get<string>('notification.smtp.user');
    const pass = this.configService.get<string>('notification.smtp.password');
    if (user && pass) {
      return { user, pass };
    }
    return undefined;
  }
}
