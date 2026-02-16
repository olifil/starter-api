import { AbilityFactory } from '@shared/authorization/abilities/abilities.factory';
import { Role, User } from '@prisma/client';
import { Action } from '@shared/authorization/enums/action.enum';
import { Subject } from '@shared/authorization/enums/subject.enum';
import { subject } from '@casl/ability';

describe('AbilityFactory', () => {
  let factory: AbilityFactory;

  beforeEach(() => {
    factory = new AbilityFactory();
  });

  describe('SUPER_ADMIN', () => {
    it('should have all permissions', () => {
      const user = {
        role: Role.SUPER_ADMIN,
        id: '1',
      } as User;
      const ability = factory.defineAbility(user);

      expect(ability.can(Action.Manage as any, Subject.All as any)).toBe(true);
      expect(ability.can(Action.Read as any, Subject.Config as any)).toBe(true);
      expect(ability.can(Action.Update as any, Subject.Config as any)).toBe(true);
      expect(ability.can(Action.Delete as any, Subject.User as any)).toBe(true);
    });
  });

  describe('ADMIN', () => {
    it('should manage users but not access config', () => {
      const user = {
        role: Role.ADMIN,
        id: '1',
      } as User;
      const ability = factory.defineAbility(user);

      expect(ability.can(Action.Manage as any, Subject.User as any)).toBe(true);
      expect(ability.can(Action.AccessConfig as any, Subject.Config as any)).toBe(false);
      expect(ability.can(Action.Read as any, Subject.Config as any)).toBe(false);
    });
  });

  describe('AUTHENTICATED_USER', () => {
    it('should only access own resources', () => {
      const user = {
        role: Role.AUTHENTICATED_USER,
        id: '123',
      } as User;
      const ability = factory.defineAbility(user);

      // Peut lire et modifier son propre profil
      const ownUser = subject(Subject.User as any, { id: '123' });
      expect(ability.can(Action.Read as any, ownUser)).toBe(true);
      expect(ability.can(Action.Update as any, ownUser)).toBe(true);

      // Ne peut pas accéder aux profils d'autres utilisateurs
      const otherUser = subject(Subject.User as any, { id: '456' });
      expect(ability.can(Action.Read as any, otherUser)).toBe(false);
    });
  });

  describe('Anonymous user', () => {
    it('should have no permissions', () => {
      const ability = factory.defineAbility(undefined);

      expect(ability.can(Action.Read as any, Subject.User as any)).toBe(false);
    });
  });

  describe('ANONYMOUS_USER role', () => {
    it('should have no permissions', () => {
      const user = {
        role: Role.ANONYMOUS_USER,
        id: '1',
      } as User;
      const ability = factory.defineAbility(user);

      expect(ability.can(Action.Read as any, Subject.User as any)).toBe(false);
    });
  });
});
