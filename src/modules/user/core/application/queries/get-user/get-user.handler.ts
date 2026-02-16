import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from './get-user.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserProfileDto } from '../../dtos/user-profile.dto';
import { UserNotFoundException } from '../../exceptions/user-not-found.exception';

@Injectable()
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUserQuery): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new UserNotFoundException(query.userId);
    }
    return UserProfileDto.fromDomain(user);
  }
}
