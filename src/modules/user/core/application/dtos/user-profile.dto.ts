import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../../domain/entities/user.entity';

@Exclude()
export class UserProfileDto {
  @Expose()
  @ApiProperty({ description: "ID unique de l'utilisateur" })
  id!: string;

  @Expose()
  @ApiProperty({ description: 'Adresse email' })
  email!: string;

  @Expose()
  @ApiProperty({ description: 'Prénom' })
  firstName!: string;

  @Expose()
  @ApiProperty({ description: 'Nom de famille' })
  lastName!: string;

  @Expose()
  @ApiProperty({ description: 'Nom complet' })
  fullName!: string;

  @Expose()
  @ApiProperty({ description: 'Date de création du compte' })
  createdAt!: string;

  @Expose()
  @ApiProperty({ description: 'Date de dernière mise à jour' })
  updatedAt!: string;

  static fromDomain(user: User): UserProfileDto {
    const dto = new UserProfileDto();
    dto.id = user.id;
    dto.email = user.email.value;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.fullName = user.fullName;
    dto.createdAt = user.createdAt.toISOString();
    dto.updatedAt = user.updatedAt.toISOString();
    return dto;
  }
}
