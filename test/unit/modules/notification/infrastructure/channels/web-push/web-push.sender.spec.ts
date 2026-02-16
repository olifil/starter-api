import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebPushSender } from '@modules/notification/infrastructure/channels/web-push/web-push.sender';

const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn();

jest.mock('web-push', () => ({
  setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

describe('WebPushSender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildSender = async (config: Record<string, unknown> = {}) => {
    const defaults: Record<string, unknown> = {
      'notification.webPush.enabled': true,
      'notification.webPush.publicKey': 'public-key',
      'notification.webPush.privateKey': 'private-key',
      'notification.webPush.subject': 'mailto:admin@example.com',
      ...config,
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        return key in defaults ? defaults[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebPushSender, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    return module.get<WebPushSender>(WebPushSender);
  };

  describe('constructor', () => {
    it('should configure VAPID details when enabled', async () => {
      await buildSender();
      expect(mockSetVapidDetails).toHaveBeenCalledWith(
        'mailto:admin@example.com',
        'public-key',
        'private-key',
      );
    });

    it('should not configure VAPID details when disabled', async () => {
      await buildSender({ 'notification.webPush.enabled': false });
      expect(mockSetVapidDetails).not.toHaveBeenCalled();
    });
  });

  describe('channel', () => {
    it('should be WEB_PUSH', async () => {
      const sender = await buildSender();
      expect(sender.channel).toBe('WEB_PUSH');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', async () => {
      const sender = await buildSender();
      expect(sender.isEnabled()).toBe(true);
    });

    it('should return false when disabled', async () => {
      const sender = await buildSender({ 'notification.webPush.enabled': false });
      expect(sender.isEnabled()).toBe(false);
    });
  });

  describe('send', () => {
    it('should call sendNotification with correct subscription and payload', async () => {
      mockSendNotification.mockResolvedValue({});
      const sender = await buildSender();

      await sender.send({
        to: 'https://push.example.com/endpoint',
        subject: 'Alert',
        body: 'Something happened',
        metadata: { p256dh: 'p256dh-key', auth: 'auth-key' },
      });

      expect(mockSendNotification).toHaveBeenCalledWith(
        {
          endpoint: 'https://push.example.com/endpoint',
          keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        },
        JSON.stringify({ title: 'Alert', body: 'Something happened' }),
      );
    });

    it('should use default title when subject is not provided', async () => {
      mockSendNotification.mockResolvedValue({});
      const sender = await buildSender();

      await sender.send({ to: 'https://push.example.com/endpoint', body: 'Message' });

      const callArgs = mockSendNotification.mock.calls[0][1] as string;
      expect(JSON.parse(callArgs).title).toBe('Notification');
    });

    it('should throw when channel is not enabled', async () => {
      const sender = await buildSender({ 'notification.webPush.enabled': false });

      await expect(
        sender.send({ to: 'https://push.example.com/endpoint', body: 'test' }),
      ).rejects.toThrow('Web-Push channel is not enabled');
    });
  });
});
