import { PushSubscription } from '@modules/notification/core/domain/entities/push-subscription.entity';

describe('PushSubscription', () => {
  const makeSubscription = (overrides = {}) =>
    new PushSubscription({
      userId: 'user-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      p256dh: 'base64-p256dh-key',
      auth: 'base64-auth-key',
      ...overrides,
    });

  it('should be defined', () => {
    expect(makeSubscription()).toBeDefined();
  });

  it('should generate an id when none is provided', () => {
    const sub = makeSubscription();
    expect(sub.id).toBeTruthy();
    expect(typeof sub.id).toBe('string');
  });

  it('should use the provided id', () => {
    const sub = makeSubscription({ id: 'fixed-id' });
    expect(sub.id).toBe('fixed-id');
  });

  it('should expose all properties correctly', () => {
    const now = new Date();
    const sub = makeSubscription({ createdAt: now });

    expect(sub.userId).toBe('user-1');
    expect(sub.endpoint).toBe('https://fcm.googleapis.com/fcm/send/abc123');
    expect(sub.p256dh).toBe('base64-p256dh-key');
    expect(sub.auth).toBe('base64-auth-key');
    expect(sub.createdAt).toBe(now);
  });

  it('should default createdAt to current date when not provided', () => {
    const before = new Date();
    const sub = makeSubscription();
    const after = new Date();

    expect(sub.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(sub.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
