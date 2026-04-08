import { IsOptional, IsEnum, IsUUID, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import { TaskPriority } from '../../domain/entities/task-priority.enum';

export class TaskFilterDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(['position', 'createdAt', 'dueDate', 'priority', 'status', 'title'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  depth?: number;
}
