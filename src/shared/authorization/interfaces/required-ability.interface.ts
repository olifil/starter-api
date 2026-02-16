import { Action } from '../enums/action.enum';
import { Subject } from '../enums/subject.enum';

export interface RequiredAbility {
  action: Action;
  subject: Subject;
}
