import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NodemailerEmailSender } from '@modules/notification/infrastructure/channels/email/nodemailer-email.sender';

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => mockCreateTransport(...args),
}));

describe('NodemailerEmailSender', () => {
  const buildSender = async (config: Record<string, unknown> = {}) => {
    const defaults: Record<string, unknown> = {
      'notification.smtp.enabled': true,
      'notification.smtp.host': 'smtp.example.com',
      'notification.smtp.port': 587,
      'notification.smtp.secure': false,
      'notification.smtp.from': 'noreply@example.com',
      'notification.smtp.user': undefined,
      'notification.smtp.password': undefined,
      ...config,
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        return key in defaults ? defaults[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NodemailerEmailSender, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    return {
      sender: module.get<NodemailerEmailSender>(NodemailerEmailSender),
      configService: module.get(ConfigService),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create transporter when SMTP is enabled', async () => {
      const { sender } = await buildSender();
      expect(sender).toBeDefined();
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'smtp.example.com', port: 587 }),
      );
    });

    it('should not create transporter when SMTP is disabled', async () => {
      const { sender } = await buildSender({ 'notification.smtp.enabled': false });
      expect(sender).toBeDefined();
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it('should create transporter with auth when user and password are set', async () => {
      await buildSender({
        'notification.smtp.user': 'user@example.com',
        'notification.smtp.password': 'secret',
      });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { user: 'user@example.com', pass: 'secret' },
        }),
      );
    });

    it('should create transporter without auth when credentials are missing', async () => {
      await buildSender();
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ auth: undefined }),
      );
    });

    it('should set ignoreTLS when secure is false', async () => {
      await buildSender({ 'notification.smtp.secure': false });
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ ignoreTLS: true }),
      );
    });

    it('should not set ignoreTLS when secure is true', async () => {
      await buildSender({ 'notification.smtp.secure': true });
      const callArgs = mockCreateTransport.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs['ignoreTLS']).toBeUndefined();
    });
  });

  describe('isEnabled', () => {
    it('should return true when SMTP is enabled', async () => {
      const { sender } = await buildSender();
      expect(sender.isEnabled()).toBe(true);
    });

    it('should return false when SMTP is disabled', async () => {
      const { sender } = await buildSender({ 'notification.smtp.enabled': false });
      expect(sender.isEnabled()).toBe(false);
    });
  });

  describe('defaultUserPreference', () => {
    it('should return true when SMTP is enabled', async () => {
      const { sender } = await buildSender();
      expect(sender.defaultUserPreference()).toBe(true);
    });

    it('should return false when SMTP is disabled', async () => {
      const { sender } = await buildSender({ 'notification.smtp.enabled': false });
      expect(sender.defaultUserPreference()).toBe(false);
    });
  });

  describe('send', () => {
    it('should send an email with correct fields', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-id' });
      const { sender } = await buildSender();

      await sender.send({
        to: 'recipient@example.com',
        subject: 'Hello',
        body: '<p>Test</p>',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Hello',
        html: '<p>Test</p>',
      });
    });

    it('should send email with empty subject when not provided', async () => {
      mockSendMail.mockResolvedValue({});
      const { sender } = await buildSender();

      await sender.send({ to: 'recipient@example.com', body: '<p>Test</p>' });

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ subject: '' }));
    });

    it('should throw when channel is not enabled', async () => {
      const { sender } = await buildSender({ 'notification.smtp.enabled': false });

      await expect(sender.send({ to: 'recipient@example.com', body: 'test' })).rejects.toThrow(
        'Email channel is not enabled',
      );
    });
  });

  describe('channel', () => {
    it('should be EMAIL', async () => {
      const { sender } = await buildSender();
      expect(sender.channel).toBe('EMAIL');
    });
  });
});
