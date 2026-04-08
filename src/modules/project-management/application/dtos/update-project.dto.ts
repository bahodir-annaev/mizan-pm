import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../../domain/entities/project-status.enum';
import { ProjectType } from '../../domain/entities/project-type.enum';
import { ProjectSize } from '../../domain/entities/project-size.enum';
import { ComplexityLevel } from '../../domain/entities/complexity-level.enum';

export class UpdateProjectDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: ProjectType })
  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @ApiPropertyOptional({ enum: ProjectSize })
  @IsEnum(ProjectSize)
  @IsOptional()
  size?: ProjectSize;

  @ApiPropertyOptional({ enum: ComplexityLevel })
  @IsEnum(ComplexityLevel)
  @IsOptional()
  complexity?: ComplexityLevel;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  areaSqm?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  estimatedDuration?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
