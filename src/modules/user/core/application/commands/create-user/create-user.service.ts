import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { CreateUserCommand } from './create-user.command';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { HashedPassword } from '../../../domain/value-objects/hashed-password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserProfileDto } from '../../dtos/user-profile.dto';
import { EmailAlreadyExistsException } from '../../exceptions/email-already-exists.exception';

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserService implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserProfileDto> {
    const email = new Email(command.email);

    // Vérifier si l'email existe déjà
    const exists = await this.userRepository.existsByEmail(email);
    if (exists) {
      throw new EmailAlreadyExistsException(command.email);
    }

    // Créer le mot de passe hashé
    const password = await HashedPassword.fromPlainPassword(command.password);

    // Créer l'entité User
    const user = new User({
      email,
      password,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    // Sauvegarder
    const savedUser = await this.userRepository.save(user);

    // Publier les events de domaine
    savedUser.domainEvents.forEach((event) => {
      this.eventBus.publish(event as IEvent);
    });
    savedUser.clearDomainEvents();

    return UserProfileDto.fromDomain(savedUser);
  }
}
