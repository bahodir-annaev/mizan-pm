import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from './domain/entities/time-entry.entity';
import { TaskAssignee } from '../project-management/domain/entities/task-assignee.entity';
import { TIME_ENTRY_REPOSITORY } from './domain/repositories/time-entry-repository.interface';
import { TypeOrmTimeEntryRepository } from './infrastructure/persistence/typeorm-time-entry.repository';
import { TimeTrackingService } from './application/services/time-tracking.service';
import { TimeTrackingController } from './presentation/controllers/time-tracking.controller';
import { TimeEntryController } from './presentation/controllers/time-entry.controller';
import { UserTimeController } from './presentation/controllers/user-time.controller';
import { ProjectTimeReportController } from './presentation/controllers/project-time-report.controller';
import { ActiveSessionsController } from './presentation/controllers/active-sessions.controller';
import { TaskActiveTimerController } from './presentation/controllers/task-active-timer.controller';
import { IdentityModule } from '../identity/identity.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeEntry, TaskAssignee]),
    IdentityModule,
    forwardRef(() => FinanceModule),
  ],
  controllers: [
    TimeTrackingController,
    TimeEntryController,
    UserTimeController,
    ProjectTimeReportController,
    ActiveSessionsController,
    TaskActiveTimerController,
  ],
  providers: [
    TimeTrackingService,
    {
      provide: TIME_ENTRY_REPOSITORY,
      useClass: TypeOrmTimeEntryRepository,
    },
  ],
  exports: [TimeTrackingService, TIME_ENTRY_REPOSITORY],
})
export class TimeTrackingModule {}
