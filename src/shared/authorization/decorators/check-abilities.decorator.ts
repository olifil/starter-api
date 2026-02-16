import { SetMetadata } from '@nestjs/common';
import { RequiredAbility } from '../interfaces/required-ability.interface';

export const CHECK_ABILITY_KEY = 'check_ability';
export const CheckAbilities = (...abilities: RequiredAbility[]) =>
  SetMetadata(CHECK_ABILITY_KEY, abilities);

// Re-export RequiredAbility for use in guards
export type { RequiredAbility };
