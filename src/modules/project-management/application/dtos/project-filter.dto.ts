import { IsOptional, IsEnum, IsUUID, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';
import { ProjectStatus } from '../../domain/entities/project-status.enum';

export class ProjectFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter by project status' })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by team ID' })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({ example: 'office building', description: 'Full-text search in project name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['name', 'createdAt', 'status', 'startDate', 'dueDate'] })
  @IsIn(['name', 'createdAt', 'status', 'startDate', 'dueDate'])
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
