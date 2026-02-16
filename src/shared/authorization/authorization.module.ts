import { Module, Global } from '@nestjs/common';
import { AbilityFactory } from './abilities/abilities.factory';

@Global()
@Module({
  providers: [AbilityFactory],
  exports: [AbilityFactory],
})
export class AuthorizationModule {}
