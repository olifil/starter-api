import { User, UserProps } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import { UserUpdatedEvent } from '@modules/user/core/domain/events/user-updated.event';

describe('User Entity', () => {
  const createValidUserProps = (): UserProps => ({
    email: new Email('test@example.com'),
    password: HashedPassword.fromHash('hashed-password'),
    firstName: 'John',
    lastName: 'Doe',
  });

  describe('constructor', () => {
    it('should create user with all properties', () => {
      // Arrange
      const props = createValidUserProps();

      // Act
      const user = new User(props);

      // Assert
      expect(user.id).toBeDefined();
      expect(user.email).toBe(props.email);
      expect(user.password).toBe(props.password);
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate UUID when id is not provided', () => {
      // Arrange
      const props = createValidUserProps();

      // Act
      const user = new User(props);

      // Assert
      expect(user.id).toBeDefined();
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should use provided id when given', () => {
      // Arrange
      const props: UserProps = {
        ...createValidUserProps(),
        id: 'custom-id-123',
      };

      // Act
      const user = new User(props);

      // Assert
      expect(user.id).toBe('custom-id-123');
    });

    it('should use provided dates when given', () => {
      // Arrange
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const props: UserProps = {
        ...createValidUserProps(),
        createdAt,
        updatedAt,
      };

      // Act
      const user = new User(props);

      // Assert
      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
    });

    it('should create UserCreatedEvent when id is not provided', () => {
      // Arrange
      const props = createValidUserProps();

      // Act
      const user = new User(props);

      // Assert
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserCreatedEvent);
      expect((user.domainEvents[0] as UserCreatedEvent).userId).toBe(user.id);
      expect((user.domainEvents[0] as UserCreatedEvent).email).toBe('test@example.com');
    });

    it('should not create UserCreatedEvent when id is provided', () => {
      // Arrange
      const props: UserProps = {
        ...createValidUserProps(),
        id: 'existing-id',
      };

      // Act
      const user = new User(props);

      // Assert
      expect(user.domainEvents).toHaveLength(0);
    });
  });

  describe('getters', () => {
    it('should return fullName as combination of firstName and lastName', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);

      // Act
      const fullName = user.fullName;

      // Assert
      expect(fullName).toBe('John Doe');
    });

    it('should return correct fullName after update', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);

      // Act
      user.updateProfile('Jane', 'Smith');
      const fullName = user.fullName;

      // Assert
      expect(fullName).toBe('Jane Smith');
    });
  });

  describe('updateProfile', () => {
    it('should update firstName and lastName', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const initialUpdatedAt = user.updatedAt;

      // Act
      user.updateProfile('Jane', 'Smith');

      // Assert
      expect(user.firstName).toBe('Jane');
      expect(user.lastName).toBe('Smith');
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should create UserUpdatedEvent with changes', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      user.clearDomainEvents(); // Clear creation event

      // Act
      user.updateProfile('Jane', 'Smith');

      // Assert
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserUpdatedEvent);
      expect((user.domainEvents[0] as UserUpdatedEvent).changes).toEqual({
        firstName: { old: 'John', new: 'Jane' },
        lastName: { old: 'Doe', new: 'Smith' },
      });
    });

    it('should only track changed fields in event', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      user.clearDomainEvents();

      // Act
      user.updateProfile('Jane', 'Doe'); // Only firstName changed

      // Assert
      expect((user.domainEvents[0] as UserUpdatedEvent).changes).toEqual({
        firstName: { old: 'John', new: 'Jane' },
      });
    });

    it('should not create event if no changes', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      user.clearDomainEvents();

      // Act
      user.updateProfile('John', 'Doe'); // No changes

      // Assert
      expect(user.domainEvents).toHaveLength(0);
    });

    it('should throw error for empty firstName', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);

      // Act & Assert
      expect(() => user.updateProfile('', 'Doe')).toThrow('firstName ne peut pas être vide');
    });

    it('should throw error for whitespace-only firstName', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);

      // Act & Assert
      expect(() => user.updateProfile('   ', 'Doe')).toThrow('firstName ne peut pas être vide');
    });

    it('should throw error for empty lastName', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);

      // Act & Assert
      expect(() => user.updateProfile('John', '')).toThrow('lastName ne peut pas être vide');
    });

    it('should throw error for firstName longer than 50 characters', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const longName = 'a'.repeat(51);

      // Act & Assert
      expect(() => user.updateProfile(longName, 'Doe')).toThrow(
        'firstName ne peut pas dépasser 50 caractères',
      );
    });

    it('should throw error for lastName longer than 50 characters', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const longName = 'a'.repeat(51);

      // Act & Assert
      expect(() => user.updateProfile('John', longName)).toThrow(
        'lastName ne peut pas dépasser 50 caractères',
      );
    });

    it('should accept names with exactly 50 characters', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const maxName = 'a'.repeat(50);

      // Act & Assert
      expect(() => user.updateProfile(maxName, maxName)).not.toThrow();
    });
  });

  describe('changeEmail', () => {
    it('should update email', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const newEmail = new Email('newemail@example.com');

      // Act
      user.changeEmail(newEmail);

      // Assert
      expect(user.email).toBe(newEmail);
      expect(user.email.value).toBe('newemail@example.com');
    });

    it('should update updatedAt timestamp', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const initialUpdatedAt = user.updatedAt;
      const newEmail = new Email('newemail@example.com');

      // Act
      user.changeEmail(newEmail);

      // Assert
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(initialUpdatedAt.getTime());
    });

    it('should create UserUpdatedEvent with email change', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      user.clearDomainEvents();
      const newEmail = new Email('newemail@example.com');

      // Act
      user.changeEmail(newEmail);

      // Assert
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserUpdatedEvent);
      expect((user.domainEvents[0] as UserUpdatedEvent).changes).toEqual({
        email: { old: 'test@example.com', new: 'newemail@example.com' },
      });
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);
      const props: UserProps = {
        ...createValidUserProps(),
        password: hashedPassword,
      };
      const user = new User(props);

      // Act
      const result = await user.verifyPassword(plainPassword);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const plainPassword = 'ValidPass123!';
      const wrongPassword = 'WrongPass456!';
      const hashedPassword = await HashedPassword.fromPlainPassword(plainPassword);
      const props: UserProps = {
        ...createValidUserProps(),
        password: hashedPassword,
      };
      const user = new User(props);

      // Act
      const result = await user.verifyPassword(wrongPassword);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('domain events management', () => {
    it('should add events to domainEvents array', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      const initialEventCount = user.domainEvents.length;

      // Act
      user.updateProfile('Jane', 'Smith');

      // Assert
      expect(user.domainEvents.length).toBe(initialEventCount + 1);
    });

    it('should clear all domain events', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);
      user.updateProfile('Jane', 'Smith');

      // Act
      user.clearDomainEvents();

      // Assert
      expect(user.domainEvents).toHaveLength(0);
    });

    it('should accumulate multiple events', () => {
      // Arrange
      const props = createValidUserProps();
      const user = new User(props);

      // Act
      user.updateProfile('Jane', 'Smith');
      user.changeEmail(new Email('new@example.com'));

      // Assert
      expect(user.domainEvents.length).toBeGreaterThan(2);
    });
  });
});
