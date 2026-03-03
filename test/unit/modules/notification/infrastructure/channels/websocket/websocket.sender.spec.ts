import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebSocketSender } from '@modules/notification/infrastructure/channels/websocket/websocket.sender';
import { NotificationGateway } from '@modules/notification/interface/websocket/notification.gateway';

describe('WebSocketSender', () => {
  let gateway: jest.Mocked<NotificationGateway>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildSender = async (config: Record<string, unknown> = {}) => {
    const defaults: Record<string, unknown> = {
      'notification.websocket.enabled': true,
      ...config,
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        return key in defaults ? defaults[key] : defaultValue;
      }),
    };

    const mockGateway = {
      sendToUser: jest.fn(),
    } as unknown as jest.Mocked<NotificationGateway>;

    gateway = mockGateway;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSocketSender,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationGateway, useValue: mockGateway },
      ],
    }).compile();

    return module.get<WebSocketSender>(WebSocketSender);
  };

  describe('channel', () => {
    it('should be WEBSOCKET', async () => {
      const sender = await buildSender();
      expect(sender.channel).toBe('WEBSOCKET');
    });
  });

  describe('isEnabled', () => {
    it('should return true when WS_ENABLED is true', async () => {
      const sender = await buildSender();
      expect(sender.isEnabled()).toBe(true);
    });

    it('should return false when WS_ENABLED is false', async () => {
      const sender = await buildSender({ 'notification.websocket.enabled': false });
      expect(sender.isEnabled()).toBe(false);
    });
  });

  describe('defaultUserPreference', () => {
    it('should return true when WebSocket is enabled', async () => {
      const sender = await buildSender();
      expect(sender.defaultUserPreference()).toBe(true);
    });

    it('should return false when WebSocket is disabled', async () => {
      const sender = await buildSender({ 'notification.websocket.enabled': false });
      expect(sender.defaultUserPreference()).toBe(false);
    });
  });

  describe('send', () => {
    it('should call gateway.sendToUser with correct arguments', async () => {
      const sender = await buildSender();

      await sender.send({
        to: 'user-123',
        subject: 'New message',
        body: 'You have a new notification',
        metadata: { key: 'value' },
      });

      expect(gateway.sendToUser).toHaveBeenCalledWith('user-123', {
        subject: 'New message',
        body: 'You have a new notification',
        metadata: { key: 'value' },
      });
    });

    it('should throw when channel is not enabled', async () => {
      const sender = await buildSender({ 'notification.websocket.enabled': false });

      // send() throws synchronously (no async keyword)
      expect(() => sender.send({ to: 'user-123', body: 'test' })).toThrow(
        'WebSocket channel is not enabled',
      );
    });

    it('should resolve without error when send succeeds', async () => {
      const sender = await buildSender();

      await expect(sender.send({ to: 'user-123', body: 'test' })).resolves.toBeUndefined();
    });
  });
});
