import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  ForcedSubject,
  InferSubjects,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { User, Role } from '@prisma/client';
import { Action } from '../enums/action.enum';
import { Subject } from '../enums/subject.enum';

type Subjects = InferSubjects<'User' | 'Config' | 'Notification' | 'all'> | ForcedSubject<any>;

type Actions =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'access_config'
  | 'manage_users';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class AbilityFactory {
  defineAbility(user?: User): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (!user) {
      // Anonymous user - aucune permission
      return build();
    }

    switch (user.role) {
      case Role.SUPER_ADMIN:
        can(Action.Manage as Actions, Subject.All as Subjects);
        break;

      case Role.ADMIN:
        can(Action.Manage as Actions, Subject.User as Subjects);
        can(Action.Manage as Actions, Subject.Notification as Subjects);
        cannot(Action.AccessConfig as Actions, Subject.Config as Subjects);
        break;

      case Role.AUTHENTICATED_USER:
        // Peut gérer ses propres ressources
        can(Action.Read as Actions, Subject.User as Subjects, { id: user.id } as any);
        can(Action.Update as Actions, Subject.User as Subjects, { id: user.id } as any);
        // Notifications : lecture et mise à jour de ses propres notifications/préférences
        can(Action.Read as Actions, Subject.Notification as Subjects, { userId: user.id } as any);
        can(Action.Update as Actions, Subject.Notification as Subjects, { userId: user.id } as any);
        break;

      default:
        // Par défaut, aucune permission
        break;
    }

    return build();
  }
}
