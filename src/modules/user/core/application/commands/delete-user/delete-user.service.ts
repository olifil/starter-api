import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DeleteUserCommand } from './delete-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception';
import { UserDeletedEvent } from '../../../domain/events/user-deleted.event';

@Injectable()
@CommandHandler(DeleteUserCommand)
export class DeleteUserService implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    await this.userRepository.delete(command.userId);

    // Publier l'event de suppression
    this.eventBus.publish(new UserDeletedEvent(command.userId));
  }
}
