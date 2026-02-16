import { Test, TestingModule } from '@nestjs/testing';
import { NoopPushSender } from '@modules/notification/infrastructure/channels/push/noop-push.sender';

describe('NoopPushSender', () => {
  let sender: NoopPushSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NoopPushSender],
    }).compile();

    sender = module.get<NoopPushSender>(NoopPushSender);
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
  });

  it('should have channel PUSH', () => {
    expect(sender.channel).toBe('PUSH');
  });

  it('should always be disabled', () => {
    expect(sender.isEnabled()).toBe(false);
  });

  it('should resolve without error', async () => {
    await expect(
      sender.send({ to: 'user-id', body: 'Test notification' }),
    ).resolves.toBeUndefined();
  });
});
