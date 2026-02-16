import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ContactHttpController } from '@modules/notification/interface/http-controller/contact.http-controller';
import { SendContactEmailCommand } from '@modules/notification/core/application/commands/send-contact-email/send-contact-email.command';

describe('ContactHttpController', () => {
  let controller: ContactHttpController;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactHttpController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();

    controller = module.get<ContactHttpController>(ContactHttpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendContactEmail', () => {
    it('should dispatch SendContactEmailCommand and return void', async () => {
      const dto = {
        senderName: 'Alice Dupont',
        senderEmail: 'alice@example.com',
        subject: 'Question about the service',
        body: 'Hello, I have a question...',
      };
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.sendContactEmail(dto as any);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendContactEmailCommand(dto.senderName, dto.senderEmail, dto.subject, dto.body),
      );
      expect(result).toBeUndefined();
    });

    it('should dispatch SendContactEmailCommand with minimal fields', async () => {
      const dto = {
        senderName: 'Bob',
        senderEmail: 'bob@example.com',
        subject: 'Hi',
        body: 'Short message.',
      };
      commandBus.execute.mockResolvedValue(undefined);

      await controller.sendContactEmail(dto as any);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendContactEmailCommand(dto.senderName, dto.senderEmail, dto.subject, dto.body),
      );
    });

    it('should call commandBus.execute exactly once per request', async () => {
      const dto = {
        senderName: 'Charlie',
        senderEmail: 'charlie@example.com',
        subject: 'Another question',
        body: 'More details here.',
      };
      commandBus.execute.mockResolvedValue(undefined);

      await controller.sendContactEmail(dto as any);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors thrown by commandBus', async () => {
      const dto = {
        senderName: 'Dave',
        senderEmail: 'dave@example.com',
        subject: 'Error case',
        body: 'This will fail.',
      };
      const error = new Error('Mail delivery failed');
      commandBus.execute.mockRejectedValue(error);

      await expect(controller.sendContactEmail(dto as any)).rejects.toThrow('Mail delivery failed');
      expect(commandBus.execute).toHaveBeenCalledWith(
        new SendContactEmailCommand(dto.senderName, dto.senderEmail, dto.subject, dto.body),
      );
    });
  });
});
