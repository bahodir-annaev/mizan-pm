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
import { ProjectType } from '../../domain/entities/project-type.enum';
import { ProjectSize } from '../../domain/entities/project-size.enum';
import { ComplexityLevel } from '../../domain/entities/complexity-level.enum';

export class CreateProjectDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

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
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
