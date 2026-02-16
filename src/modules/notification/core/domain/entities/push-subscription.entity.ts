import { v4 as uuid } from 'uuid';

export interface PushSubscriptionProps {
  id?: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt?: Date;
}

export class PushSubscription {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _endpoint: string;
  private readonly _p256dh: string;
  private readonly _auth: string;
  private readonly _createdAt: Date;

  constructor(props: PushSubscriptionProps) {
    this._id = props.id || uuid();
    this._userId = props.userId;
    this._endpoint = props.endpoint;
    this._p256dh = props.p256dh;
    this._auth = props.auth;
    this._createdAt = props.createdAt || new Date();
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get endpoint(): string {
    return this._endpoint;
  }
  get p256dh(): string {
    return this._p256dh;
  }
  get auth(): string {
    return this._auth;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
}
