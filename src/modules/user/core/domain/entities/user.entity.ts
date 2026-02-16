import { v4 as uuid } from 'uuid';
import { Role } from '@prisma/client';
import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserUpdatedEvent, ProfileChanges } from '../events/user-updated.event';

export interface UserProps {
  id?: string;
  email: Email;
  password: HashedPassword;
  firstName: string;
  lastName: string;
  role?: Role;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private readonly _id: string;
  private _email: Email;
  private _password: HashedPassword;
  private _firstName: string;
  private _lastName: string;
  private _role: Role;
  private _emailVerified: boolean;
  private _emailVerifiedAt: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _domainEvents: unknown[] = [];

  constructor(props: UserProps) {
    this._id = props.id || uuid();
    this._email = props.email;
    this._password = props.password;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._role = props.role || Role.AUTHENTICATED_USER;
    this._emailVerified = props.emailVerified ?? false;
    this._emailVerifiedAt = props.emailVerifiedAt ?? null;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();

    if (!props.id) {
      this.addDomainEvent(
        new UserCreatedEvent(this._id, this._email.value, this._firstName, this._lastName),
      );
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get password(): HashedPassword {
    return this._password;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  get role(): Role {
    return this._role;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get emailVerifiedAt(): Date | null {
    return this._emailVerifiedAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get domainEvents(): unknown[] {
    return this._domainEvents;
  }

  // Méthodes métier
  updateProfile(firstName: string, lastName: string): void {
    this.validateName(firstName, 'firstName');
    this.validateName(lastName, 'lastName');

    const changes: ProfileChanges = {};

    if (this._firstName !== firstName) {
      changes.firstName = { old: this._firstName, new: firstName };
      this._firstName = firstName;
    }

    if (this._lastName !== lastName) {
      changes.lastName = { old: this._lastName, new: lastName };
      this._lastName = lastName;
    }

    if (Object.keys(changes).length > 0) {
      this._updatedAt = new Date();
      this.addDomainEvent(new UserUpdatedEvent(this._id, changes));
    }
  }

  changeEmail(newEmail: Email): void {
    const changes: ProfileChanges = {
      email: { old: this._email.value, new: newEmail.value },
    };

    this._email = newEmail;
    this._updatedAt = new Date();
    this.addDomainEvent(new UserUpdatedEvent(this._id, changes));
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    return this._password.verify(plainPassword);
  }

  changePassword(newPassword: HashedPassword): void {
    this._password = newPassword;
    this._updatedAt = new Date();
  }

  verifyEmail(): void {
    this._emailVerified = true;
    this._emailVerifiedAt = new Date();
    this._updatedAt = new Date();
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  private addDomainEvent(event: unknown): void {
    this._domainEvents.push(event);
  }

  private validateName(name: string, field: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error(`${field} ne peut pas être vide`);
    }
    if (name.length > 50) {
      throw new Error(`${field} ne peut pas dépasser 50 caractères`);
    }
  }
}
