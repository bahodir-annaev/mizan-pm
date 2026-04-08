import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsInt,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import { TaskPriority } from '../../domain/entities/task-priority.enum';
import { WorkType } from '../../domain/entities/work-type.enum';
import { AcceptanceStatus } from '../../domain/entities/acceptance-status.enum';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsEnum(AcceptanceStatus)
  @IsOptional()
  acceptance?: AcceptanceStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @IsNumber()
  @IsOptional()
  volume?: number;

  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
