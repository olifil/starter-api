import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { SearchUsersQuery } from './search-users.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserProfileDto } from '../../dtos/user-profile.dto';

@Injectable()
@QueryHandler(SearchUsersQuery)
export class SearchUsersHandler implements IQueryHandler<SearchUsersQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: SearchUsersQuery): Promise<UserProfileDto[]> {
    const users = await this.userRepository.searchByName(query.query, query.limit);

    return users.map((user) => UserProfileDto.fromDomain(user));
  }
}
