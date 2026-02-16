import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../../core/domain/entities/user.entity';
import { Email } from '../../../core/domain/value-objects/email.vo';
import { HashedPassword } from '../../../core/domain/value-objects/hashed-password.vo';
import { IUserRepository } from '../../../core/domain/repositories/user.repository.interface';
import { Role } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { User as PrismaUser } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  private readonly logger = new Logger(PrismaUserRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<User> {
    try {
      const data = this.toPrisma(user);
      const saved = await this.prisma.user.create({ data });
      this.logger.log(`User created: ${saved.id}`);
      return this.toDomain(saved);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error saving user: ${err.message}`, err.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.value },
    });
    return user ? this.toDomain(user) : null;
  }

  async update(user: User): Promise<User> {
    const data = this.toPrisma(user);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });
    this.logger.log(`User updated: ${user.id}`);
    return this.toDomain(updated);
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.value },
    });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`User deleted: ${id}`);
  }

  async findAll(page: number, pageSize: number): Promise<{ users: User[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const [prismaUsers, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    const users = prismaUsers.map((prismaUser) => this.toDomain(prismaUser));
    return { users, total };
  }

  async findByRole(role: Role): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toDomain(u));
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return users.map((u) => this.toDomain(u));
  }

  async searchByName(query: string, limit: number): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { firstName: 'asc' },
    });
    return users.map((u) => this.toDomain(u));
  }

  // Méthodes de mapping Domain ↔ Prisma

  private toDomain(prismaUser: PrismaUser): User {
    return new User({
      id: prismaUser.id,
      email: new Email(prismaUser.email),
      password: HashedPassword.fromHash(prismaUser.passwordHash),
      firstName: prismaUser.firstName ?? '',
      lastName: prismaUser.lastName ?? '',
      role: prismaUser.role,
      emailVerified: prismaUser.emailVerified,
      emailVerifiedAt: prismaUser.emailVerifiedAt,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    });
  }

  private toPrisma(domainUser: User) {
    return {
      id: domainUser.id,
      email: domainUser.email.value,
      passwordHash: domainUser.password.hash,
      firstName: domainUser.firstName,
      lastName: domainUser.lastName,
      role: domainUser.role,
      emailVerified: domainUser.emailVerified,
      emailVerifiedAt: domainUser.emailVerifiedAt,
      bio: null,
      avatarUrl: null,
      phoneNumber: null,
      lastLoginAt: null,
    };
  }
}
