import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { UpdateUserCommand } from './update-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserProfileDto } from '../../dtos/user-profile.dto';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(UpdateUserCommand)
export class UpdateUserService implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    // Appliquer les modifications via la méthode métier de l'entité
    if (command.firstName || command.lastName || command.phoneNumber !== undefined) {
      user.updateProfile(
        command.firstName ?? user.firstName,
        command.lastName ?? user.lastName,
        command.phoneNumber,
      );
    }

    const updatedUser = await this.userRepository.update(user);

    // Publier les events de domaine
    updatedUser.domainEvents.forEach((event) => {
      this.eventBus.publish(event as IEvent);
    });
    updatedUser.clearDomainEvents();

    await this.matomoService.trackUserProfileUpdated(command.userId);

    return UserProfileDto.fromDomain(updatedUser);
  }
}
