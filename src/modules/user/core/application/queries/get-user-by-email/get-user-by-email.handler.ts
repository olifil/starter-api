import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUserByEmailQuery } from './get-user-by-email.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserProfileDto } from '../../dtos/user-profile.dto';
import { Email } from '../../../domain/value-objects/email.vo';

@Injectable()
@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUserByEmailQuery): Promise<UserProfileDto | null> {
    const email = new Email(query.email);
    const user = await this.userRepository.findByEmail(email);
    return user ? UserProfileDto.fromDomain(user) : null;
  }
}
