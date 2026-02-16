import { IS_PUBLIC_KEY, Public } from '@shared/authorization/decorators/public.decorator';
import { ROLES_KEY, Roles } from '@shared/authorization/decorators/roles.decorator';
import {
  CHECK_ABILITY_KEY,
  CheckAbilities,
} from '@shared/authorization/decorators/check-abilities.decorator';
import { Action } from '@shared/authorization/enums/action.enum';
import { Subject } from '@shared/authorization/enums/subject.enum';

describe('Authorization Decorators', () => {
  describe('Public', () => {
    it('should set IS_PUBLIC_KEY metadata to true', () => {
      const decorator = Public();
      const target = class {};
      decorator(target);

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, target);
      expect(metadata).toBe(true);
    });

    it('should export IS_PUBLIC_KEY as "isPublic"', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });

  describe('Roles', () => {
    it('should set ROLES_KEY metadata with provided roles', () => {
      const decorator = Roles('ADMIN', 'SUPER_ADMIN');
      const target = class {};
      decorator(target);

      const metadata = Reflect.getMetadata(ROLES_KEY, target);
      expect(metadata).toEqual(['ADMIN', 'SUPER_ADMIN']);
    });

    it('should set empty array when no roles provided', () => {
      const decorator = Roles();
      const target = class {};
      decorator(target);

      const metadata = Reflect.getMetadata(ROLES_KEY, target);
      expect(metadata).toEqual([]);
    });

    it('should export ROLES_KEY as "roles"', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });

  describe('CheckAbilities', () => {
    it('should set CHECK_ABILITY_KEY metadata with provided abilities', () => {
      const abilities = [
        { action: Action.Read, subject: Subject.User },
        { action: Action.Manage, subject: Subject.All },
      ];
      const decorator = CheckAbilities(...abilities);
      const target = class {};
      decorator(target);

      const metadata = Reflect.getMetadata(CHECK_ABILITY_KEY, target);
      expect(metadata).toEqual(abilities);
    });

    it('should set single ability', () => {
      const ability = { action: Action.Create, subject: Subject.Notification };
      const decorator = CheckAbilities(ability);
      const target = class {};
      decorator(target);

      const metadata = Reflect.getMetadata(CHECK_ABILITY_KEY, target);
      expect(metadata).toEqual([ability]);
    });

    it('should export CHECK_ABILITY_KEY as "check_ability"', () => {
      expect(CHECK_ABILITY_KEY).toBe('check_ability');
    });
  });
});
