export class SearchUsersQuery {
  constructor(
    public readonly query: string,
    public readonly limit: number = 10,
  ) {}
}
