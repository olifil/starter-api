import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SendContactEmailService } from '@modules/notification/core/application/commands/send-contact-email/send-contact-email.service';
import { SendContactEmailCommand } from '@modules/notification/core/application/commands/send-contact-email/send-contact-email.command';

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

describe('SendContactEmailService', () => {
  let service: SendContactEmailService;

  const buildModule = async (configOverrides: Record<string, unknown> = {}) => {
    const defaults: Record<string, unknown> = {
      'app.contactEmail': 'contact@example.com',
      'notification.smtp.enabled': true,
      'notification.smtp.host': 'localhost',
      'notification.smtp.port': 1025,
      'notification.smtp.secure': false,
      'notification.smtp.user': undefined,
      'notification.smtp.password': undefined,
      'notification.smtp.from': 'noreply@starter.local',
    };

    const config = { ...defaults, ...configOverrides };
    const mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) =>
          key in config ? config[key] : defaultValue,
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SendContactEmailService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    return module.get<SendContactEmailService>(SendContactEmailService);
  };

  beforeEach(() => {
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({});
  });

  it('should be defined', async () => {
    service = await buildModule();
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should send an email with correct fields', async () => {
      service = await buildModule();
      const command = new SendContactEmailCommand(
        'Jean Dupont',
        'jean@example.com',
        'Mon sujet',
        'Mon message',
      );

      await service.execute(command);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'contact@example.com',
          subject: 'Mon sujet',
          replyTo: 'Jean Dupont <jean@example.com>',
        }),
      );
    });

    it('should use the configured from address', async () => {
      service = await buildModule({ 'notification.smtp.from': 'hello@monapp.fr' });
      const command = new SendContactEmailCommand('A', 'a@a.com', 'Sujet', 'Corps');

      await service.execute(command);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'hello@monapp.fr' }),
      );
    });

    it('should not send when CONTACT_EMAIL is not configured', async () => {
      service = await buildModule({ 'app.contactEmail': undefined });
      const command = new SendContactEmailCommand('A', 'a@a.com', 'Sujet', 'Corps');

      await service.execute(command);

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should not send when SMTP is disabled', async () => {
      service = await buildModule({ 'notification.smtp.enabled': false });
      const command = new SendContactEmailCommand('A', 'a@a.com', 'Sujet', 'Corps');

      await service.execute(command);

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});
