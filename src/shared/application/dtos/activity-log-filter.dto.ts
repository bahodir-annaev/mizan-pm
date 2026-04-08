import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../pagination.dto';

export class ActivityLogFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by action type (e.g. created, updated, deleted)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by entity type (e.g. project, task, team)' })
  @IsOptional()
  @IsString()
  entityType?: string;
}
