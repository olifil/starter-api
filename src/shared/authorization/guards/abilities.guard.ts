import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from '../abilities/abilities.factory';
import { CHECK_ABILITY_KEY } from '../decorators/check-abilities.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequiredAbility } from '../interfaces/required-ability.interface';

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required abilities
    const requiredAbilities =
      this.reflector.get<RequiredAbility[]>(CHECK_ABILITY_KEY, context.getHandler()) || [];

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Build user abilities
    const ability = this.abilityFactory.defineAbility(user);

    // Check each required ability
    for (const { action, subject } of requiredAbilities) {
      if (!ability.can(action as any, subject as any)) {
        throw new ForbiddenException(`Vous n'avez pas la permission d'effectuer cette action`);
      }
    }

    return true;
  }
}
