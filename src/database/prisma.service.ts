import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    // Configuration pour Prisma 7 avec adapter PostgreSQL
    const connectionString = configService.get<string>('database.url');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in configuration');
    }

    const adapter = new PrismaPg({ connectionString });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
