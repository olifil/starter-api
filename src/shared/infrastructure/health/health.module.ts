import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthController } from './health.controller';
import { HealthMonitorService } from './health-monitor.service';
import { RedisHealthIndicator } from './redis.health-indicator';
import { PrismaModule } from '@database/prisma.module';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [TerminusModule, PrismaModule, CqrsModule, UserModule],
  controllers: [HealthController],
  providers: [HealthMonitorService, RedisHealthIndicator],
})
export class HealthModule {}
