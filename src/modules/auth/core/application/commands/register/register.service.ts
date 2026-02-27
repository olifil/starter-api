import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus, IEvent } from '@nestjs/cqrs';
import { RegisterCommand } from './register.command';
import { User } from '@modules/user/core/domain/entities/user.entity';
import { Email } from '@modules/user/core/domain/value-objects/email.vo';
import { HashedPassword } from '@modules/user/core/domain/value-objects/hashed-password.vo';
import { UserCreatedEvent } from '@modules/user/core/domain/events/user-created.event';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/user/core/domain/repositories/user.repository.interface';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { TermsNotAcceptedException } from '@modules/auth/core/application/exceptions/terms-not-accepted.exception';
import { MatomoService } from '@shared/infrastructure/analytics/matomo.service';
import { EmailTokenService } from '../../services/email-token.service';

@Injectable()
@CommandHandler(RegisterCommand)
export class RegisterService implements ICommandHandler<RegisterCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly emailTokenService: EmailTokenService,
    private readonly eventBus: EventBus,
    private readonly matomoService: MatomoService,
  ) {}

  async execute(command: RegisterCommand): Promise<void> {
    // Vérifier l'acceptation des CGU
    if (!command.termsAccepted) {
      throw new TermsNotAcceptedException();
    }

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

    // Générer le token de vérification d'email
    const verificationToken = await this.emailTokenService.generateVerificationToken(
      savedUser.id,
      savedUser.email.value,
    );

    // Publier les events de domaine en enrichissant UserCreatedEvent avec le token
    // Note: on itère sur `user` (pas `savedUser`) car le repository retourne une nouvelle
    // entité reconstruite depuis la DB (avec id fourni), ce qui empêche l'ajout automatique
    // des domain events dans le constructeur de User.
    for (const event of user.domainEvents) {
      if (event instanceof UserCreatedEvent) {
        this.eventBus.publish(
          new UserCreatedEvent(
            event.userId,
            event.email,
            event.firstName,
            event.lastName,
            verificationToken,
          ),
        );
      } else {
        this.eventBus.publish(event as IEvent);
      }
    }
    user.clearDomainEvents();

    // Tracker l'inscription dans Matomo
    await this.matomoService.trackUserRegistration(savedUser.id);
  }
}
