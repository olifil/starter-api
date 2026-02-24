import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DeleteUserCommand } from './delete-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception';
import { UserDeletedEvent } from '../../../domain/events/user-deleted.event';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';

@Injectable()
@CommandHandler(DeleteUserCommand)
export class DeleteUserService implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    // Mémoriser email et prénom avant suppression pour la notification
    const email = user.email.value;
    const firstName = user.firstName;

    // Publier l'event AVANT la suppression pour que la notification
    // puisse résoudre l'utilisateur et enqueuer le job avec son email
    this.eventBus.publish(new UserDeletedEvent(command.userId, email, firstName));

    await this.matomoService.trackUserDeleted(command.userId);
    await this.userRepository.delete(command.userId);
  }
}
