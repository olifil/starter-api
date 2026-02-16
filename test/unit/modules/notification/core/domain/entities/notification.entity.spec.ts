import { Notification } from '@modules/notification/core/domain/entities/notification.entity';
import { NotificationType } from '@modules/notification/core/domain/value-objects/notification-type.vo';
import { NotificationSentEvent } from '@modules/notification/core/domain/events/notification-sent.event';
import { NotificationFailedEvent } from '@modules/notification/core/domain/events/notification-failed.event';

describe('Notification', () => {
  const makeNotification = (overrides = {}) =>
    new Notification({
      userId: 'user-1',
      type: new NotificationType('welcome'),
      channel: 'EMAIL',
      body: '<p>Hello</p>',
      subject: 'Welcome',
      ...overrides,
    });

  it('should be defined', () => {
    expect(makeNotification()).toBeDefined();
  });

  it('should have default status PENDING', () => {
    const notification = makeNotification();
    expect(notification.status).toBe('PENDING');
  });

  it('should generate an id when none is provided', () => {
    const notification = makeNotification();
    expect(notification.id).toBeTruthy();
    expect(typeof notification.id).toBe('string');
  });

  it('should use the provided id', () => {
    const notification = makeNotification({ id: 'fixed-id' });
    expect(notification.id).toBe('fixed-id');
  });

  it('should have default retryCount of 0', () => {
    const notification = makeNotification();
    expect(notification.retryCount).toBe(0);
  });

  describe('markAsQueued', () => {
    it('should change status to QUEUED', () => {
      const notification = makeNotification();
      notification.markAsQueued();
      expect(notification.status).toBe('QUEUED');
    });

    it('should update updatedAt', () => {
      const notification = makeNotification();
      const before = notification.updatedAt;
      notification.markAsQueued();
      expect(notification.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('markAsSent', () => {
    it('should change status to SENT', () => {
      const notification = makeNotification();
      notification.markAsSent();
      expect(notification.status).toBe('SENT');
    });

    it('should set sentAt', () => {
      const notification = makeNotification();
      expect(notification.sentAt).toBeUndefined();
      notification.markAsSent();
      expect(notification.sentAt).toBeInstanceOf(Date);
    });

    it('should add a NotificationSentEvent to domainEvents', () => {
      const notification = makeNotification();
      notification.markAsSent();
      expect(notification.domainEvents).toHaveLength(1);
      expect(notification.domainEvents[0]).toBeInstanceOf(NotificationSentEvent);
    });
  });

  describe('markAsFailed', () => {
    it('should change status to FAILED', () => {
      const notification = makeNotification();
      notification.markAsFailed('SMTP error');
      expect(notification.status).toBe('FAILED');
    });

    it('should set failedAt and failureReason', () => {
      const notification = makeNotification();
      notification.markAsFailed('connection timeout');
      expect(notification.failedAt).toBeInstanceOf(Date);
      expect(notification.failureReason).toBe('connection timeout');
    });

    it('should add a NotificationFailedEvent to domainEvents', () => {
      const notification = makeNotification();
      notification.markAsFailed('error');
      expect(notification.domainEvents).toHaveLength(1);
      expect(notification.domainEvents[0]).toBeInstanceOf(NotificationFailedEvent);
    });
  });

  describe('markAsRead', () => {
    it('should change status to READ', () => {
      const notification = makeNotification({ status: 'SENT' });
      notification.markAsRead();
      expect(notification.status).toBe('READ');
    });

    it('should set readAt', () => {
      const notification = makeNotification({ status: 'SENT' });
      expect(notification.readAt).toBeUndefined();
      notification.markAsRead();
      expect(notification.readAt).toBeInstanceOf(Date);
    });
  });

  describe('incrementRetry', () => {
    it('should increment retryCount by 1', () => {
      const notification = makeNotification();
      notification.incrementRetry();
      expect(notification.retryCount).toBe(1);
      notification.incrementRetry();
      expect(notification.retryCount).toBe(2);
    });
  });

  describe('clearDomainEvents', () => {
    it('should clear all domain events', () => {
      const notification = makeNotification();
      notification.markAsSent();
      expect(notification.domainEvents).toHaveLength(1);
      notification.clearDomainEvents();
      expect(notification.domainEvents).toHaveLength(0);
    });
  });
});
