import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './domain/entities/notification.entity';
import { NotificationService } from './application/services/notification.service';
import { NotificationController } from './presentation/controllers/notification.controller';
import { NotificationListener } from './application/listeners/notification.listener';
import { IdentityModule } from '../identity/identity.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { Task } from '../project-management/domain/entities/task.entity';
import { TaskAssignee } from '../project-management/domain/entities/task-assignee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Task, TaskAssignee]),
    IdentityModule,
    RealtimeModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationListener],
  exports: [NotificationService],
})
export class NotificationsModule {}
