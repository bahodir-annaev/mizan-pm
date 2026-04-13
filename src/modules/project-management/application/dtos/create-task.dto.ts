import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../../domain/entities/task-priority.enum';
import { WorkType } from '../../domain/entities/work-type.enum';

export class CreateTaskDto {
  @ApiProperty({ example: 'Design floor plan', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Detailed description of the task' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-of-project', format: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: 'uuid-of-parent-task', format: 'uuid', description: 'Parent task ID for sub-tasks' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: WorkType, example: WorkType.ARCHITECTURE })
  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @ApiPropertyOptional({ example: 8.5, description: 'Estimated hours to complete' })
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 100, description: 'Volume/quantity for the task' })
  @IsNumber()
  @IsOptional()
  volume?: number;

  @ApiPropertyOptional({ example: 'm²', description: 'Unit of measure for volume' })
  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ example: 'uuid-of-user', format: 'uuid', description: 'Initial assignee user ID' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-05-01', description: 'ISO date string' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'ISO date string' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
