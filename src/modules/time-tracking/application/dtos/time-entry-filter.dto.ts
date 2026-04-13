import { IsOptional, IsUUID, IsDateString, IsIn, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';

export class TimeEntryFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by task ID' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Filter entries starting on or after this date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Filter entries ending on or before this date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Filter manual vs timer entries' })
  @IsBooleanString()
  @IsOptional()
  isManual?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Filter billable entries' })
  @IsBooleanString()
  @IsOptional()
  isBillable?: string;

  @ApiPropertyOptional({ enum: ['startTime', 'endTime', 'durationSeconds', 'createdAt'] })
  @IsIn(['startTime', 'endTime', 'durationSeconds', 'createdAt'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
