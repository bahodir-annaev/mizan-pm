import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './domain/entities/activity-log.entity';
import { ACTIVITY_LOG_REPOSITORY } from './domain/repositories/activity-log-repository.interface';
import { TypeOrmActivityLogRepository } from './infrastructure/persistence/typeorm-activity-log.repository';
import { ActivityLoggerService } from './application/services/activity-logger.service';
import { ActivityLogListener } from './application/listeners/activity-log.listener';
import { ActivityLogController } from './presentation/controllers/activity-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [ActivityLogController],
  providers: [
    ActivityLoggerService,
    ActivityLogListener,
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: TypeOrmActivityLogRepository,
    },
  ],
  exports: [ActivityLoggerService],
})
export class SharedModule {}
