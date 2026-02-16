import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendContactEmailCommand } from './send-contact-email.command';

@Injectable()
@CommandHandler(SendContactEmailCommand)
export class SendContactEmailService implements ICommandHandler<SendContactEmailCommand> {
  private readonly logger = new Logger(SendContactEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async execute(command: SendContactEmailCommand): Promise<void> {
    const contactEmail = this.configService.get<string>('app.contactEmail');
    const smtpEnabled = this.configService.get<boolean>('notification.smtp.enabled', false);

    if (!contactEmail) {
      this.logger.warn('CONTACT_EMAIL not configured — contact email not sent');
      return;
    }

    if (!smtpEnabled) {
      this.logger.warn('SMTP not configured — contact email not sent');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('notification.smtp.host'),
      port: this.configService.get<number>('notification.smtp.port', 1025),
      secure: this.configService.get<boolean>('notification.smtp.secure', false),
      auth: this.configService.get<string>('notification.smtp.user')
        ? {
            user: this.configService.get<string>('notification.smtp.user'),
            pass: this.configService.get<string>('notification.smtp.password'),
          }
        : undefined,
    });

    const from = this.configService.get<string>('notification.smtp.from', 'noreply@starter.local');

    await transporter.sendMail({
      from,
      replyTo: `${command.senderName} <${command.senderEmail}>`,
      to: contactEmail,
      subject: command.subject,
      text: command.body,
      html: `<p>${command.body.replace(/\n/g, '<br>')}</p>
             <hr>
             <small>Envoyé par : ${command.senderName} &lt;${command.senderEmail}&gt;</small>`,
    });

    this.logger.log(`Contact email sent from ${command.senderEmail} to ${contactEmail}`);
  }
}
