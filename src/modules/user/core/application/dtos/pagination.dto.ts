import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Page actuelle' })
  currentPage!: number;

  @ApiProperty({ description: "Nombre d'éléments par page" })
  pageSize!: number;

  @ApiProperty({ description: "Nombre total d'éléments" })
  totalItems!: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Y a-t-il une page suivante ?' })
  hasNextPage!: boolean;

  @ApiProperty({ description: 'Y a-t-il une page précédente ?' })
  hasPreviousPage!: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Données paginées', isArray: true })
  data!: T[];

  @ApiProperty({ description: 'Métadonnées de pagination', type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static create<T>(
    data: T[],
    totalItems: number,
    currentPage: number,
    pageSize: number,
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(totalItems / pageSize);

    const response = new PaginatedResponseDto<T>();
    response.data = data;
    response.meta = {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };

    return response;
  }
}
