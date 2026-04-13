import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../../domain/entities/project-status.enum';

export class ProjectResponseDto {
  @ApiProperty({ example: 'project-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'City Center Office', description: 'Project name' })
  name: string;

  @ApiPropertyOptional({ example: 'CCO-2026', nullable: true })
  code: string | null;

  @ApiPropertyOptional({ example: 'Mixed-use office complex, 12 floors', nullable: true })
  description: string | null;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.IN_PROGRESS })
  status: ProjectStatus;

  @ApiPropertyOptional({ example: 'COMMERCIAL', nullable: true })
  projectType: string | null;

  @ApiPropertyOptional({ example: 'LARGE', nullable: true })
  size: string | null;

  @ApiPropertyOptional({ example: 'HIGH', nullable: true })
  priority: string | null;

  @ApiPropertyOptional({ example: 5400.5, nullable: true, description: 'Total area in m²' })
  areaSqm: number | null;

  @ApiPropertyOptional({ example: 500000, nullable: true, description: 'Budget in base currency' })
  budget: number | null;

  @ApiProperty({ example: 35, description: 'Completion percentage 0–100' })
  progress: number;

  @ApiProperty({ example: false })
  isPinned: boolean;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiPropertyOptional({ example: '2026-03-01', nullable: true })
  startDate: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  dueDate: string | null;

  @ApiPropertyOptional({ example: 'team-uuid', format: 'uuid', nullable: true })
  teamId: string | null;

  @ApiPropertyOptional({ example: 'client-uuid', format: 'uuid', nullable: true })
  clientId: string | null;

  @ApiPropertyOptional({ example: 'org-uuid', format: 'uuid', nullable: true })
  orgId: string | null;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  createdBy: string;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T10:30:00Z' })
  updatedAt: Date;
}

export class ProjectMemberResponseDto {
  @ApiProperty({ example: 'member-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'project-uuid', format: 'uuid' })
  projectId: string;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'member', description: 'member | manager | viewer' })
  role: string;

  @ApiProperty({ example: '2026-01-15T00:00:00Z' })
  createdAt: Date;
}
