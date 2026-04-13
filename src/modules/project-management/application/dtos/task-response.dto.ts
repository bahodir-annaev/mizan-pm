import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import { TaskPriority } from '../../domain/entities/task-priority.enum';
import { WorkType } from '../../domain/entities/work-type.enum';
import { AcceptanceStatus } from '../../domain/entities/acceptance-status.enum';

export class TaskAssigneeResponseDto {
  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiPropertyOptional({ example: 'john@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  assignedAt: Date;
}

export class TaskResponseDto {
  @ApiProperty({ example: 'task-uuid', format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ example: 'TASK-001', nullable: true })
  code: string | null;

  @ApiProperty({ example: 'Design floor plan for level 3' })
  title: string;

  @ApiPropertyOptional({ example: 'Detailed architectural floor plan including dimensions', nullable: true })
  description: string | null;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  priority: TaskPriority;

  @ApiPropertyOptional({ enum: WorkType, example: WorkType.ARCHITECTURE, nullable: true })
  workType: WorkType | null;

  @ApiPropertyOptional({ enum: AcceptanceStatus, example: AcceptanceStatus.PENDING, nullable: true })
  acceptance: AcceptanceStatus | null;

  @ApiProperty({ example: 45, description: 'Completion percentage 0–100' })
  progress: number;

  @ApiPropertyOptional({ example: 16, nullable: true, description: 'Estimated hours' })
  estimatedHours: number | null;

  @ApiPropertyOptional({ example: 500, nullable: true })
  volume: number | null;

  @ApiPropertyOptional({ example: 'm²', nullable: true })
  unitOfMeasure: string | null;

  @ApiProperty({ example: 'project-uuid', format: 'uuid' })
  projectId: string;

  @ApiPropertyOptional({ example: 'parent-task-uuid', format: 'uuid', nullable: true })
  parentId: string | null;

  @ApiProperty({ example: 0, description: 'Depth in task hierarchy (0 = top-level)' })
  depth: number;

  @ApiProperty({ example: 2, description: 'Zero-based sort position among siblings' })
  position: number;

  @ApiPropertyOptional({ example: '2026-05-01', nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ example: '2026-06-30', nullable: true })
  dueDate: string | null;

  @ApiPropertyOptional({ example: 'assignee-uuid', format: 'uuid', nullable: true })
  assigneeId: string | null;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  createdBy: string;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [TaskAssigneeResponseDto], description: 'Loaded when requested' })
  assignees?: TaskAssigneeResponseDto[];
}
