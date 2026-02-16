import { v4 as uuid } from 'uuid';
import { NotificationChannel } from '../value-objects/notification-channel.vo';

export interface NotificationPreferenceProps {
  id?: string;
  userId: string;
  channel: NotificationChannel;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class NotificationPreference {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _channel: NotificationChannel;
  private _enabled: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: NotificationPreferenceProps) {
    this._id = props.id || uuid();
    this._userId = props.userId;
    this._channel = props.channel;
    this._enabled = props.enabled ?? true;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get channel(): NotificationChannel {
    return this._channel;
  }
  get enabled(): boolean {
    return this._enabled;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  enable(): void {
    this._enabled = true;
    this._updatedAt = new Date();
  }

  disable(): void {
    this._enabled = false;
    this._updatedAt = new Date();
  }

  toggle(): void {
    this._enabled = !this._enabled;
    this._updatedAt = new Date();
  }
}
