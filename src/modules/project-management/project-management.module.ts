import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from './domain/entities/project.entity';
import { Task } from './domain/entities/task.entity';
import { TaskAssignee } from './domain/entities/task-assignee.entity';
import { ProjectMember } from './domain/entities/project-member.entity';
import { ProjectTeamAssignment } from './domain/entities/project-team-assignment.entity';
import { TaskParticipant } from './domain/entities/task-participant.entity';
import { TaskDependency } from './domain/entities/task-dependency.entity';
import { ChecklistItem } from './domain/entities/checklist-item.entity';
import { Comment } from './domain/entities/comment.entity';
import { TaskStatusLog } from './domain/entities/task-status-log.entity';
import { TaskStatusDurationListener } from './application/listeners/task-status-duration.listener';

import { PROJECT_REPOSITORY } from './domain/repositories/project-repository.interface';
import { TypeOrmProjectRepository } from './infrastructure/persistence/typeorm-project.repository';
import { TASK_REPOSITORY } from './domain/repositories/task-repository.interface';
import { TypeOrmTaskRepository } from './infrastructure/persistence/typeorm-task.repository';

import { ProjectService } from './application/services/project.service';
import { TaskService } from './application/services/task.service';
import { TaskFeaturesService } from './application/services/task-features.service';
import { ProjectController } from './presentation/controllers/project.controller';
import { TaskController } from './presentation/controllers/task.controller';
import { ProjectTaskController } from './presentation/controllers/project-task.controller';
import { TaskFeaturesController } from './presentation/controllers/task-features.controller';

import { IdentityModule } from '../identity/identity.module';
import { OrganizationModule } from '../organization/organization.module';
import { TeamMembership } from '../organization/domain/entities/team-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project, Task, TaskAssignee, ProjectMember, ProjectTeamAssignment,
      TaskParticipant, TaskDependency, ChecklistItem, Comment,
      TeamMembership, TaskStatusLog,
    ]),
    IdentityModule,
    OrganizationModule,
  ],
  controllers: [ProjectController, TaskController, ProjectTaskController, TaskFeaturesController],
  providers: [
    ProjectService,
    TaskService,
    TaskFeaturesService,
    TaskStatusDurationListener,
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeOrmProjectRepository,
    },
    {
      provide: TASK_REPOSITORY,
      useClass: TypeOrmTaskRepository,
    },
  ],
  exports: [ProjectService, PROJECT_REPOSITORY, TaskService, TASK_REPOSITORY],
})
export class ProjectManagementModule {}
