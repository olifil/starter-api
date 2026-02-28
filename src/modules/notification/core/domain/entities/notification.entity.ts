import { v4 as uuid } from 'uuid';
import { NotificationChannel } from '../value-objects/notification-channel.vo';
import { NotificationStatus } from '../value-objects/notification-status.vo';
import { NotificationType } from '../value-objects/notification-type.vo';
import { NotificationSentEvent } from '../events/notification-sent.event';
import { NotificationFailedEvent } from '../events/notification-failed.event';

export interface NotificationProps {
  id?: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status?: NotificationStatus;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Notification {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _type: NotificationType;
  private readonly _channel: NotificationChannel;
  private _status: NotificationStatus;
  private readonly _subject: string | undefined;
  private readonly _body: string;
  private readonly _metadata: Record<string, unknown> | undefined;
  private _sentAt: Date | undefined;
  private _readAt: Date | undefined;
  private _failedAt: Date | undefined;
  private _failureReason: string | undefined;
  private _retryCount: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _domainEvents: object[] = [];

  constructor(props: NotificationProps) {
    this._id = props.id || uuid();
    this._userId = props.userId;
    this._type = props.type;
    this._channel = props.channel;
    this._status = props.status || 'PENDING';
    this._subject = props.subject;
    this._body = props.body;
    this._metadata = props.metadata;
    this._sentAt = props.sentAt;
    this._readAt = props.readAt;
    this._failedAt = props.failedAt;
    this._failureReason = props.failureReason;
    this._retryCount = props.retryCount || 0;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get type(): NotificationType {
    return this._type;
  }
  get channel(): NotificationChannel {
    return this._channel;
  }
  get status(): NotificationStatus {
    return this._status;
  }
  get subject(): string | undefined {
    return this._subject;
  }
  get body(): string {
    return this._body;
  }
  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }
  get sentAt(): Date | undefined {
    return this._sentAt;
  }
  get readAt(): Date | undefined {
    return this._readAt;
  }
  get failedAt(): Date | undefined {
    return this._failedAt;
  }
  get failureReason(): string | undefined {
    return this._failureReason;
  }
  get retryCount(): number {
    return this._retryCount;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get domainEvents(): object[] {
    return this._domainEvents;
  }

  markAsQueued(): void {
    this._status = 'QUEUED';
    this._updatedAt = new Date();
  }

  markAsSent(): void {
    this._status = 'SENT';
    this._sentAt = new Date();
    this._updatedAt = new Date();
    this.addDomainEvent(
      new NotificationSentEvent(this._id, this._userId, this._type.value, this._channel),
    );
  }

  markAsFailed(reason: string): void {
    this._status = 'FAILED';
    this._failedAt = new Date();
    this._failureReason = reason;
    this._updatedAt = new Date();
    this.addDomainEvent(
      new NotificationFailedEvent(this._id, this._userId, this._type.value, this._channel, reason),
    );
  }

  markAsRead(): void {
    this._status = 'READ';
    this._readAt = new Date();
    this._updatedAt = new Date();
  }

  markAsDeleted(): void {
    this._status = 'DELETED';
    this._updatedAt = new Date();
  }

  incrementRetry(): void {
    this._retryCount += 1;
    this._updatedAt = new Date();
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  private addDomainEvent(event: object): void {
    this._domainEvents.push(event);
  }
}
