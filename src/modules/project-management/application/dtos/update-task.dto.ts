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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../../domain/entities/task-status.enum';
import { TaskPriority } from '../../domain/entities/task-priority.enum';
import { WorkType } from '../../domain/entities/work-type.enum';
import { AcceptanceStatus } from '../../domain/entities/acceptance-status.enum';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated task title', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.HIGH })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: WorkType, example: WorkType.ARCHITECTURE })
  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @ApiPropertyOptional({ enum: AcceptanceStatus, example: AcceptanceStatus.APPROVED })
  @IsEnum(AcceptanceStatus)
  @IsOptional()
  acceptance?: AcceptanceStatus;

  @ApiPropertyOptional({ example: 75, minimum: 0, maximum: 100, description: 'Completion percentage' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiPropertyOptional({ example: 8.5 })
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  volume?: number;

  @ApiPropertyOptional({ example: 'm²' })
  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: 'uuid-of-user', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
