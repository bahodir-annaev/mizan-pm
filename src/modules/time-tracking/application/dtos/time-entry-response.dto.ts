import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeEntryResponseDto {
  @ApiProperty({ example: 'entry-uuid', format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'task-uuid', format: 'uuid' })
  taskId: string;

  @ApiProperty({ example: 'user-uuid', format: 'uuid' })
  userId: string;

  @ApiProperty({ example: '2026-04-11T09:00:00Z' })
  startTime: Date;

  @ApiPropertyOptional({ example: '2026-04-11T11:30:00Z', nullable: true, description: 'Null while timer is still running' })
  endTime: Date | null;

  @ApiPropertyOptional({ example: 9000, nullable: true, description: 'Duration in seconds; null if still running' })
  durationSeconds: number | null;

  @ApiPropertyOptional({ example: 2.5, nullable: true, description: 'Hours equivalent of duration' })
  hours: number | null;

  @ApiProperty({ example: false, description: 'True if created manually rather than via start/stop timer' })
  isManual: boolean;

  @ApiProperty({ example: false })
  isBillable: boolean;

  @ApiPropertyOptional({ example: 'Worked on floor plan revision', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: 'project-uuid', format: 'uuid', nullable: true })
  projectId: string | null;

  @ApiPropertyOptional({ example: '2026-04-11', nullable: true })
  date: string | null;

  @ApiProperty({ example: '2026-04-11T09:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-11T11:30:00Z' })
  updatedAt: Date;
}
