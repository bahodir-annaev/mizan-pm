import { IsOptional, IsUUID, IsDateString, IsIn, IsBooleanString } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';

export class TimeEntryFilterDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBooleanString()
  @IsOptional()
  isManual?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsBooleanString()
  @IsOptional()
  isBillable?: string;

  @IsIn(['startTime', 'endTime', 'durationSeconds', 'createdAt'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
