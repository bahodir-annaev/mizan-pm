import { IsOptional, IsEnum, IsUUID, IsString, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/application/pagination.dto';
import { ProjectStatus } from '../../domain/entities/project-status.enum';

export class ProjectFilterDto extends PaginationQueryDto {
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(['name', 'createdAt', 'status', 'startDate', 'dueDate'])
  @IsOptional()
  sortBy?: string;

  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
