import { Test, TestingModule } from '@nestjs/testing';
import { NoopSmsSender } from '@modules/notification/infrastructure/channels/sms/noop-sms.sender';

describe('NoopSmsSender', () => {
  let sender: NoopSmsSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NoopSmsSender],
    }).compile();

    sender = module.get<NoopSmsSender>(NoopSmsSender);
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
  });

  it('should have channel SMS', () => {
    expect(sender.channel).toBe('SMS');
  });

  it('should always be disabled', () => {
    expect(sender.isEnabled()).toBe(false);
  });

  it('should have defaultUserPreference false — requires phone number', () => {
    expect(sender.defaultUserPreference()).toBe(false);
  });

  it('should resolve without error', async () => {
    await expect(
      sender.send({ to: '+33600000000', body: 'Test message' }),
    ).resolves.toBeUndefined();
  });
});
