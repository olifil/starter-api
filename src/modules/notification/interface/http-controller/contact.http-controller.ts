import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@shared/authorization';
import { ContactDto } from '../../core/application/dtos/contact.dto';
import { SendContactEmailCommand } from '../../core/application/commands/send-contact-email/send-contact-email.command';

@Controller('contact')
@ApiTags('Contact')
@Public()
export class ContactHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Envoyer un message aux gestionnaires du site' })
  @ApiResponse({ status: 204, description: 'Message envoyé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async sendContactEmail(@Body() dto: ContactDto): Promise<void> {
    await this.commandBus.execute(
      new SendContactEmailCommand(dto.senderName, dto.senderEmail, dto.subject, dto.body),
    );
  }
}
