import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUsersQuery } from './get-users.query';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { UserProfileDto } from '../../dtos/user-profile.dto';
import { PaginatedResponseDto } from '../../dtos/pagination.dto';

@Injectable()
@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUsersQuery): Promise<PaginatedResponseDto<UserProfileDto>> {
    const { users, total } = await this.userRepository.findAll(query.page, query.pageSize);

    const userDtos = users.map((user) => UserProfileDto.fromDomain(user));

    return PaginatedResponseDto.create(userDtos, total, query.page, query.pageSize);
  }
}
